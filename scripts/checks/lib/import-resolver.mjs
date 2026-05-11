/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Resolve JSDoc `import('relative/path').TypeName` references inside a port file's typedefs by following imports within the same modules/<name>/ boundary, parsing target files, and rewriting the verbose import-type form to bare typedef names.
 * @sidecar import-resolver.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Same-module JSDoc import-type resolver for capabilities-sync.
 *
 * Why this exists. ADR-0010 "Domain shape resolution" decided that ports
 * which reference domain shapes via `import('../domain/foo.mjs').Foo`
 * should NOT inline the shape into the port file. Domain owns its shapes.
 * Instead, the capabilities generator follows the import to the target
 * file (within the module's boundary), parses its JSDoc @typedef blocks,
 * pulls in the matching typedef, and rewrites the type strings so the
 * generated manifest carries clean bare names.
 *
 * Cross-module imports are forbidden. The resolver hard-fails if a port
 * references a shape from another modules/<name>/ tree, surfacing a
 * boundary violation that hex rules already disallow.
 *
 * Pure-ish: file I/O is injected via an `fs` adapter so unit tests can
 * pass an in-memory map. The default adapter wraps Node's `fs` built-in.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { parseJsdocTypedefs } from './jsdoc-typedef-parser.mjs';

const MAX_DEPTH = 5;

/**
 * Default file-system adapter (wraps node:fs). Tests inject their own.
 */
export const defaultFs = {
  readFile(absPath) {
    return readFileSync(absPath, 'utf8');
  },
  fileExists(absPath) {
    return existsSync(absPath);
  },
};

/**
 * Resolve `import('...').TypeName` references in the given typedefs by
 * walking the same-module file graph. Returns a NEW typedefs map that
 * contains the original entries plus all transitively-referenced
 * typedefs, with type strings rewritten to bare names.
 *
 * @param {object} input
 * @param {string} input.portFile     Absolute path of the port file.
 * @param {string} input.moduleRoot   Absolute path of `modules/<name>/`.
 * @param {Record<string, object>} input.typedefs  Parsed port typedefs.
 * @param {{ readFile(p:string):string, fileExists(p:string):boolean }} [input.fs]
 * @returns {{ typedefs: Record<string, object> }}
 */
export function resolveImportTypedefs({ portFile, moduleRoot, typedefs, fs = defaultFs }) {
  const resolved = deepClone(typedefs);

  // Set of "absFile::TypeName" pairs we have already pulled in. Prevents
  // re-parsing the same typedef and breaks cycles.
  const visited = new Set();

  // Work queue of references to resolve. Each entry carries enough info to
  // locate the typedef in its target file.
  /** @type {{ refFromFile: string, importPath: string, typeName: string, depth: number }[]} */
  const queue = [];

  // Seed the queue from the existing port typedefs.
  for (const entry of Object.values(resolved)) {
    collectRefs(entry, portFile, queue, 0);
  }
  rewriteImportTypes(resolved);

  while (queue.length > 0) {
    const ref = queue.shift();
    if (ref.depth > MAX_DEPTH) {
      throw new Error(
        `import-resolver: depth cap (${MAX_DEPTH}) exceeded resolving '${ref.typeName}' from ${ref.refFromFile}`,
      );
    }

    const targetAbs = resolveImportPath(ref.refFromFile, ref.importPath);
    assertWithinModule(targetAbs, moduleRoot, ref.refFromFile, ref.importPath);

    const visitKey = `${targetAbs}::${ref.typeName}`;
    if (visited.has(visitKey)) continue;
    visited.add(visitKey);

    if (!fs.fileExists(targetAbs)) {
      throw new Error(
        `import-resolver: target file not found: ${targetAbs} (referenced from ${ref.refFromFile})`,
      );
    }
    const source = fs.readFile(targetAbs);
    const { typedefs: targetTypedefs } = parseJsdocTypedefs(source);

    if (!Object.prototype.hasOwnProperty.call(targetTypedefs, ref.typeName)) {
      throw new Error(
        `import-resolver: typedef '${ref.typeName}' not found in ${targetAbs} (referenced from ${ref.refFromFile})`,
      );
    }

    // Pull in the requested typedef, plus any sibling typedefs from the
    // same file that the pulled entry references by bare name (transitive
    // closure within one file). This handles the common pattern where a
    // record typedef references another typedef defined just above it
    // in the same domain file (e.g. Notification.level -> NotificationLevel).
    const pulled = deepClone(targetTypedefs[ref.typeName]);

    // Recurse: collect any nested import-type refs from the pulled entry,
    // anchored at the target file so relative paths resolve correctly.
    collectRefs(pulled, targetAbs, queue, ref.depth + 1);
    rewriteEntryImportTypes(pulled);

    // Last-wins is safe — same name from same file always parses to the
    // same shape. The visited set prevents redundant work.
    resolved[ref.typeName] = pulled;

    // Same-file siblings: walk all bare type references inside the pulled
    // entry and, if the name matches another typedef from the SAME target
    // file, pull that one in too. Repeat until no new typedefs surface.
    const pendingNames = collectBareTypeNames(pulled).filter(
      (name) =>
        Object.prototype.hasOwnProperty.call(targetTypedefs, name) &&
        !Object.prototype.hasOwnProperty.call(resolved, name),
    );
    while (pendingNames.length > 0) {
      const name = pendingNames.shift();
      if (Object.prototype.hasOwnProperty.call(resolved, name)) continue;
      const sibKey = `${targetAbs}::${name}`;
      if (visited.has(sibKey)) continue;
      visited.add(sibKey);

      const sibling = deepClone(targetTypedefs[name]);
      collectRefs(sibling, targetAbs, queue, ref.depth + 1);
      rewriteEntryImportTypes(sibling);
      resolved[name] = sibling;

      for (const more of collectBareTypeNames(sibling)) {
        if (
          Object.prototype.hasOwnProperty.call(targetTypedefs, more) &&
          !Object.prototype.hasOwnProperty.call(resolved, more)
        ) {
          pendingNames.push(more);
        }
      }
    }
  }

  return { typedefs: resolved };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Match `import('relative/path').TypeName` anywhere inside a type string.
 * Captures the relative path (group 1) and the type name (group 2). The
 * relative path may use single or double quotes.
 */
const IMPORT_TYPE_RE = /import\(\s*['"]([^'"]+)['"]\s*\)\.(\w+)/g;

function collectRefs(entry, fromFile, queue, depth) {
  forEachTypeString(entry, (typeStr) => {
    let m;
    IMPORT_TYPE_RE.lastIndex = 0;
    while ((m = IMPORT_TYPE_RE.exec(typeStr)) !== null) {
      queue.push({
        refFromFile: fromFile,
        importPath: m[1],
        typeName: m[2],
        depth,
      });
    }
  });
}

/**
 * Collect bare PascalCase type-name tokens that appear inside a typedef's
 * field/method type strings. Used to follow same-file sibling references
 * (e.g. Notification.level -> NotificationLevel) without requiring an
 * `import('...')` form for typedefs that live in the same domain file.
 *
 * Intentionally simple: matches `\b[A-Z]\w*\b` and lets the caller filter
 * the result against a target file's actual typedef map. False positives
 * (e.g. `Promise`, `Date`) are harmless because they will not be present
 * in the target file's typedefs.
 */
function collectBareTypeNames(entry) {
  /** @type {Set<string>} */
  const names = new Set();
  forEachTypeString(entry, (typeStr) => {
    const matches = typeStr.match(/\b[A-Z]\w*\b/g);
    if (!matches) return;
    for (const m of matches) names.add(m);
  });
  return [...names];
}

function rewriteImportTypes(typedefMap) {
  for (const entry of Object.values(typedefMap)) {
    rewriteEntryImportTypes(entry);
  }
}

function rewriteEntryImportTypes(entry) {
  forEachTypeString(entry, (typeStr, setter) => {
    if (!IMPORT_TYPE_RE.test(typeStr)) return;
    IMPORT_TYPE_RE.lastIndex = 0;
    const next = typeStr.replace(IMPORT_TYPE_RE, (_full, _imp, name) => name);
    setter(next);
  });
}

/**
 * Walk every type-bearing string in a parsed typedef entry. Calls
 * `cb(typeStr, setter)` where setter writes a new value back to the
 * source location. Handles both interface (methods) and record (fields)
 * shapes, including method-only typedefs that also carry fields.
 */
function forEachTypeString(entry, cb) {
  if (entry && entry.fields) {
    for (const field of Object.values(entry.fields)) {
      if (typeof field.type === 'string') {
        cb(field.type, (next) => {
          field.type = next;
        });
      }
    }
  }
  if (entry && entry.methods) {
    for (const method of Object.values(entry.methods)) {
      if (Array.isArray(method.params)) {
        for (const p of method.params) {
          if (typeof p.type === 'string') {
            cb(p.type, (next) => {
              p.type = next;
            });
          }
        }
      }
      if (typeof method.returns === 'string') {
        cb(method.returns, (next) => {
          method.returns = next;
        });
      }
    }
  }
}

function resolveImportPath(fromFile, importPath) {
  // Use POSIX semantics so the resolver behaves identically on Windows
  // and Unix. The fs adapter normalizes separators on read.
  const fromDir = path.posix.dirname(toPosix(fromFile));
  const joined = path.posix.normalize(path.posix.join(fromDir, importPath));
  return joined;
}

function assertWithinModule(targetAbs, moduleRoot, fromFile, importPath) {
  const root = toPosix(moduleRoot).replace(/\/+$/, '') + '/';
  const target = toPosix(targetAbs);
  if (!target.startsWith(root)) {
    throw new Error(
      `import-resolver: cross-module import forbidden — '${importPath}' from ${fromFile} resolves outside module boundary ${moduleRoot}`,
    );
  }
}

function toPosix(p) {
  return String(p).replace(/\\/g, '/');
}

function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(deepClone);
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = deepClone(v);
  return out;
}
