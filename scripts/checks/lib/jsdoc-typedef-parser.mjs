/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure JSDoc @typedef parser extracting port method signatures and supporting record shapes for capabilities-sync.
 * @sidecar jsdoc-typedef-parser.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Parse JSDoc @typedef blocks from a source string.
 *
 * Pure function: no file I/O, no network, no code execution.
 *
 * Supported shape:
 *   /**
 *    * @typedef {object} Name
 *    * @property {type} name[?]
 *    ...
 *    *\/
 *
 * A property whose type parses as an arrow-function signature
 * `(p1: T1, p2?: T2) => Ret` is treated as a method; otherwise it is
 * treated as a plain field. A typedef whose property values are all
 * methods is classified kind="interface"; otherwise kind="record".
 *
 * @param {string} source
 * @returns {{ typedefs: Record<string, object> }}
 */
export function parseJsdocTypedefs(source) {
  const typedefs = {};
  const blocks = extractJsdocBlocks(source);

  for (const block of blocks) {
    const lines = joinTagContinuations(block.split('\n').map(stripLeader));

    // A single JSDoc block may declare multiple typedefs. Inline-record and
    // alias typedefs are self-contained on one line. Object-form typedefs
    // (`@typedef {object} Name`) own the `@property` lines that appear
    // AFTER them until the next `@typedef` header. TPL-184: lifted the
    // prior "one object-form per block" limit after log/db/task surfaced
    // the multi-typedef-per-block form which is idiomatic JSDoc.
    //
    // Parse in order, collecting an object-form bucket at each header and
    // routing subsequent @property lines into that bucket.
    /** @type {Array<{ name: string, fields: Record<string, any>, methods: Record<string, any> }>} */
    const objectBuckets = [];
    /** @type {{ fields: Record<string, any>, methods: Record<string, any> } | null} */
    let currentBucket = null;

    for (const line of lines) {
      if (line.startsWith('@typedef')) {
        const header = parseTypedefHeader(line);
        if (!header) continue;

        if (header.kind === 'inline-record') {
          typedefs[header.name] = {
            kind: 'record',
            fields: parseInlineRecordFields(header.baseType),
          };
          // Inline-record does not accept following @property lines — close
          // any open object bucket to avoid accidental absorption.
          currentBucket = null;
        } else if (header.kind === 'alias') {
          // Skip `@typedef {import('...').X} Name` forms. These are JSDoc
          // re-export aliases for IDE consumers, not capability data. The
          // port's property types reference the bare name directly; when
          // the referenced shape lives in the same module, the
          // `jsdoc-with-imports` source handles resolution via the property
          // type string. When it lives in another module, it is a
          // documentation-only hint and must not leak paths into the
          // capabilities block. TPL-184 added this skip after local-llm
          // surfaced the cross-module import-alias pattern.
          if (/\bimport\s*\(/.test(header.baseType)) {
            currentBucket = null;
            continue;
          }
          typedefs[header.name] = {
            kind: 'alias',
            type: header.baseType,
          };
          currentBucket = null;
        } else if (header.kind === 'object') {
          const bucket = { name: header.name, fields: {}, methods: {} };
          objectBuckets.push(bucket);
          currentBucket = bucket;
        }
        continue;
      }

      if (!line.startsWith('@property') || currentBucket === null) continue;
      const prop = parsePropertyLine(line);
      if (!prop) continue;

      const fnSig = parseArrowSignature(prop.type);
      if (fnSig) {
        currentBucket.methods[prop.name] = {
          params: fnSig.params,
          returns: fnSig.returns,
          ...(prop.optional ? { optional: true } : {}),
        };
      } else {
        currentBucket.fields[prop.name] = {
          type: prop.type,
          optional: prop.optional,
        };
      }
    }

    for (const bucket of objectBuckets) {
      const methodCount = Object.keys(bucket.methods).length;
      const fieldCount = Object.keys(bucket.fields).length;
      const kind = methodCount > 0 && fieldCount === 0 ? 'interface' : 'record';
      typedefs[bucket.name] =
        kind === 'interface' ? { kind, methods: bucket.methods } : { kind, fields: bucket.fields };
      if (kind === 'interface' && fieldCount > 0) {
        typedefs[bucket.name].fields = bucket.fields;
      }
    }
  }

  return { typedefs };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function extractJsdocBlocks(source) {
  const blocks = [];
  const re = /\/\*\*([\s\S]*?)\*\//g;
  let match;
  while ((match = re.exec(source)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

function stripLeader(rawLine) {
  // Remove leading whitespace and "*" from JSDoc body lines.
  return rawLine.replace(/^\s*\*\s?/, '').trim();
}

/**
 * Coalesce multi-line `@typedef`/`@property` tags into single logical lines.
 *
 * JSDoc allows a tag to span several lines when the type expression wraps
 * across a brace-balanced block — e.g.
 *
 *   @typedef {{
 *     id: string,
 *     name: string,
 *   }} TourStep
 *
 * The rest of the parser expects each `@`-tag to live on exactly one line.
 * This pass walks the stripped-line array and, when it encounters a line
 * that starts a tag with unbalanced `(`/`{`/`[`/`<` braces, greedily joins
 * the following lines (separated by a space) until the braces balance or
 * the block ends. Non-tag lines are passed through unchanged.
 *
 * TPL-184 added this after modules/onboarding/domain/tour-step.mjs surfaced
 * the multi-line inline-record form, which is idiomatic JSDoc.
 *
 * @param {string[]} lines
 * @returns {string[]}
 */
function joinTagContinuations(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('@typedef') || line.startsWith('@property')) {
      let joined = line;
      let depth = bracketDepth(joined);
      let j = i + 1;
      while (depth > 0 && j < lines.length) {
        const next = lines[j];
        // Stop at the next tag so we never absorb a sibling @property.
        if (next.startsWith('@')) break;
        joined = joined + ' ' + next;
        depth += bracketDepth(next);
        j += 1;
      }
      out.push(joined);
      i = j;
      continue;
    }
    out.push(line);
    i += 1;
  }
  return out;
}

function bracketDepth(text) {
  // Only count curly braces. JSDoc type expressions wrap across lines via
  // `{{ ... }}` inline records; method-signature parens, array brackets,
  // and generic `<>` arrows all live on one line in the existing repo
  // style and would confuse the depth math (especially `=>` arrows).
  let depth = 0;
  for (let k = 0; k < text.length; k += 1) {
    const ch = text[k];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
  }
  return depth;
}

function parseTypedefHeader(line) {
  // Three accepted forms (brace-balanced parsing):
  //   @typedef {object} Name              -> kind: "object" (uses @property)
  //   @typedef {{ a: T, b: U }} Name      -> kind: "inline-record"
  //   @typedef {'a' | 'b'} Name           -> kind: "alias"
  if (!line.startsWith('@typedef')) return null;
  const rest = line.slice('@typedef'.length).trimStart();
  if (!rest.startsWith('{')) return null;

  // Scan balanced braces to find the end of the type expression.
  let depth = 0;
  let end = -1;
  for (let i = 0; i < rest.length; i += 1) {
    const ch = rest[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;

  const inner = rest.slice(1, end).trim();
  const after = rest.slice(end + 1).trimStart();
  const nameMatch = /^(\w+)/.exec(after);
  if (!nameMatch) return null;
  const name = nameMatch[1];

  // Accept both `{object}` and `{Object}` — both are idiomatic JSDoc for
  // property-bag typedefs and appear in existing ports (TPL-184).
  if (inner === 'object' || inner === 'Object') {
    return { baseType: 'object', name, kind: 'object' };
  }
  if (inner.startsWith('{') && inner.endsWith('}')) {
    return { baseType: inner.slice(1, -1).trim(), name, kind: 'inline-record' };
  }
  return { baseType: inner, name, kind: 'alias' };
}

/**
 * Parse the body of an inline-record typedef into a fields map. Body is
 * the contents between the inner `{` and `}` (without the outer braces).
 *
 * Supported field forms:
 *   id: string
 *   message: string,
 *   level: 'info' | 'success' | 'error'
 *   options?: { foo: bar }
 *
 * Comma-separation is top-level only (nested {} / () / [] / <> are
 * preserved). The parser is intentionally narrow and matches the JSDoc
 * record form already used by the repo's domain files.
 *
 * @param {string} body
 * @returns {Record<string, { type: string, optional: boolean }>}
 */
function parseInlineRecordFields(body) {
  /** @type {Record<string, { type: string, optional: boolean }>} */
  const fields = {};
  for (const chunk of splitTopLevel(body, ',')) {
    const trimmed = chunk.trim();
    if (trimmed === '') continue;
    const m = /^(\w+)(\??)\s*:\s*(.+)$/s.exec(trimmed);
    if (!m) continue;
    const [, name, q, rawType] = m;
    fields[name] = { type: rawType.trim(), optional: q === '?' };
  }
  return fields;
}

/**
 * Parse a single @property line into { name, type, optional }.
 * Handles balanced braces inside the type (arrow functions with
 * parameter objects, union types, generics).
 */
function parsePropertyLine(line) {
  if (!line.startsWith('@property')) return null;
  const rest = line.slice('@property'.length).trimStart();
  if (!rest.startsWith('{')) return null;

  // Scan balanced braces to find end of {type}.
  let depth = 0;
  let end = -1;
  for (let i = 0; i < rest.length; i += 1) {
    const ch = rest[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;
  const type = rest.slice(1, end).trim();
  const after = rest.slice(end + 1).trimStart();

  // Name may be [optional] or bare.
  let name;
  let optional = false;
  if (after.startsWith('[')) {
    const close = after.indexOf(']');
    if (close === -1) return null;
    name = after.slice(1, close).trim();
    // Strip default value if present: [name=default]
    const eq = name.indexOf('=');
    if (eq !== -1) name = name.slice(0, eq).trim();
    optional = true;
  } else {
    const m = /^(\w+)/.exec(after);
    if (!m) return null;
    name = m[1];
  }

  return { name, type, optional };
}

/**
 * Parse an arrow-function type signature like:
 *   () => void
 *   (key: string) => *|undefined
 *   (key: string, value: *, options?: CacheSetOptions) => void
 *
 * Returns { params: [{name, type, optional?}], returns: string } or null.
 */
function parseArrowSignature(type) {
  // Must start with "(" to be an arrow-function type.
  if (!type.startsWith('(')) return null;

  // Find matching closing paren at top level.
  let depth = 0;
  let closeIdx = -1;
  for (let i = 0; i < type.length; i += 1) {
    const ch = type[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx === -1) return null;

  const paramList = type.slice(1, closeIdx);
  const afterParams = type.slice(closeIdx + 1).trimStart();
  if (!afterParams.startsWith('=>')) return null;
  const returns = afterParams.slice(2).trim();

  const params = [];
  if (paramList.trim() !== '') {
    for (const chunk of splitTopLevel(paramList, ',')) {
      const parsed = parseParam(chunk.trim());
      if (parsed) params.push(parsed);
    }
  }
  return { params, returns };
}

function parseParam(chunk) {
  // Rest parameter form: `...args: any[]` — JSDoc/TS idiomatic for variadic
  // methods. We record the declared element type as-is and mark the param as
  // rest so downstream consumers can render it. TPL-184 added this form
  // after event-bus-port.mjs surfaced it.
  const restMatch = /^\.\.\.(\w+)\s*:\s*(.+)$/.exec(chunk);
  if (restMatch) {
    const [, name, rawType] = restMatch;
    return { name, type: rawType.trim(), rest: true };
  }
  // name[?]: type
  const m = /^(\w+)(\??)\s*:\s*(.+)$/.exec(chunk);
  if (!m) return null;
  const [, name, q, rawType] = m;
  const entry = { name, type: rawType.trim() };
  if (q === '?') entry.optional = true;
  return entry;
}

function splitTopLevel(text, sep) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(' || ch === '{' || ch === '[' || ch === '<') depth += 1;
    else if (ch === ')' || ch === '}' || ch === ']' || ch === '>') depth -= 1;
    else if (ch === sep && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out;
}
