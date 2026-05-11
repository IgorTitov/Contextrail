/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure TypeScript interface parser for sibling types.d.ts files, extracting port method signatures and supporting record shapes for capabilities-sync within the ADR-0010 bounded subset.
 * @sidecar types-d-parser.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Parse TypeScript `interface` declarations from a .d.ts source string.
 *
 * Pure function: no file I/O, no network, no code execution, no deps.
 *
 * Supported subset (per ADR-0010 "Port-types convention"):
 *   - export interface Name { ... } / interface Name { ... }
 *   - method signatures:          name(p1: T1, p2?: T2): Ret;
 *   - field declarations:         name: Type;   name?: Type;
 *   - primitive / built-in types: string, number, boolean, void, unknown,
 *     never, any, Promise<T>, Record<K, V>, Array<T>, T[], union T | U
 *   - cross-references between interfaces in the same file
 *
 * Rejected (with a clean line-numbered Error):
 *   - interface generics (interface Foo<T> { ... })
 *   - extends clauses on interfaces
 *   - namespaces
 *   - type aliases (type X = ...)
 *   - decorators (@name at the start of a declaration)
 *   - mapped types ({ [K in T]: V })
 *   - conditional types (T extends U ? X : Y) — detected via `extends` keyword
 *
 * Output shape is parallel to parseJsdocTypedefs() — downstream consumers
 * cannot tell which source produced the typedef.
 *
 * @param {string} source
 * @returns {{ typedefs: Record<string, object> }}
 */
export function parseTypesDeclaration(source) {
  // Strip comments while preserving newlines so line numbers stay stable.
  const stripped = stripComments(source);

  // Reject top-level unsupported constructs first, with line numbers.
  rejectUnsupportedTopLevel(stripped);

  const typedefs = {};
  // Scan for `interface Name { ... }` declarations. An optional `export`
  // prefix is accepted. Generics and extends are rejected here with
  // precise line numbers.
  const re = /\binterface\b/g;
  let match;
  while ((match = re.exec(stripped)) !== null) {
    const idx = match.index;
    // Header starts at `interface` keyword.
    const afterKeyword = idx + 'interface'.length;
    // Parse the header up to the opening brace.
    const braceIdx = stripped.indexOf('{', afterKeyword);
    if (braceIdx === -1) continue;
    const header = stripped.slice(afterKeyword, braceIdx);
    const nameMatch = /^\s*([A-Za-z_$][\w$]*)/.exec(header);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const afterName = header.slice(nameMatch[0].length);
    const line = lineNumberFor(stripped, idx);

    if (/^\s*</.test(afterName)) {
      throw parserError(`unsupported feature: interface generics (line ${line})`);
    }
    if (/\bextends\b/.test(afterName)) {
      throw parserError(`unsupported feature: interface extends clauses (line ${line})`);
    }

    // Find the matching closing brace for the interface body.
    const bodyStart = braceIdx + 1;
    const bodyEnd = findMatchingBrace(stripped, braceIdx);
    if (bodyEnd === -1) continue;
    const body = stripped.slice(bodyStart, bodyEnd);
    const bodyLineBase = lineNumberFor(stripped, bodyStart);

    // Reject mapped types inside the body before member splitting.
    rejectMappedTypes(body, bodyLineBase);

    const members = splitMembers(body);

    const fields = {};
    const methods = {};

    for (const raw of members) {
      const member = raw.trim();
      if (member === '') continue;
      const parsed = parseMember(member);
      if (!parsed) continue;
      if (parsed.kind === 'method') {
        methods[parsed.name] = {
          params: parsed.params,
          returns: parsed.returns,
          ...(parsed.optional ? { optional: true } : {}),
        };
      } else {
        fields[parsed.name] = {
          type: parsed.type,
          optional: parsed.optional,
        };
      }
    }

    const methodCount = Object.keys(methods).length;
    const fieldCount = Object.keys(fields).length;
    const kind = methodCount > 0 && fieldCount === 0 ? 'interface' : 'record';

    typedefs[name] = kind === 'interface' ? { kind, methods } : { kind, fields };
    if (kind === 'interface' && fieldCount > 0) {
      typedefs[name].fields = fields;
    }

    // Advance past this interface to avoid re-matching the keyword.
    re.lastIndex = bodyEnd + 1;
  }

  return { typedefs };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Replace `/ * ... * /` and `// ...` comments with spaces, preserving
 * newlines so line numbers reported in errors still point at the original
 * source. No string-literal support: .d.ts files rarely contain strings,
 * and the ADR-0010 subset disallows constructs that would need them.
 */
function stripComments(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '*') {
      // Block comment.
      let j = i + 2;
      while (j < source.length && !(source[j] === '*' && source[j + 1] === '/')) {
        out += source[j] === '\n' ? '\n' : ' ';
        j += 1;
      }
      // Consume closing */
      if (j < source.length) {
        out += '  ';
        j += 2;
      }
      i = j;
      continue;
    }
    if (ch === '/' && next === '/') {
      // Line comment.
      let j = i + 2;
      while (j < source.length && source[j] !== '\n') {
        out += ' ';
        j += 1;
      }
      i = j;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function rejectUnsupportedTopLevel(source) {
  const lines = source.split('\n');
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    const trimmed = line.trim();
    if (trimmed === '') continue;
    if (trimmed.startsWith('@')) {
      // Decorator at the start of a statement.
      throw parserError(`unsupported feature: decorator (line ${idx + 1})`);
    }
    // Match: `export namespace Foo` or `namespace Foo`.
    if (/^(export\s+)?namespace\b/.test(trimmed)) {
      throw parserError(`unsupported feature: namespace (line ${idx + 1})`);
    }
    // Match: `export type X =` or `type X =`.
    // This also covers function-type aliases like `type Handler = (x) => void`.
    if (/^(export\s+)?type\s+[A-Za-z_$][\w$]*\s*(<[^=]*>)?\s*=/.test(trimmed)) {
      throw parserError(`unsupported feature: type alias (line ${idx + 1})`);
    }
  }
}

function rejectMappedTypes(body, baseLine) {
  // A mapped type looks like `{ [K in T]: V }`. Detect the `[...in...]`
  // pattern at property-key position.
  const re = /\[\s*[A-Za-z_$][\w$]*\s+in\s+/g;
  const m = re.exec(body);
  if (m) {
    const lineOffset = body.slice(0, m.index).split('\n').length - 1;
    throw parserError(`unsupported feature: mapped type (line ${baseLine + lineOffset})`);
  }
}

function lineNumberFor(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source[i] === '\n') line += 1;
  }
  return line;
}

function findMatchingBrace(source, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Split an interface body into member declarations separated by `;` or
 * newlines, respecting balanced brackets so unions and generics containing
 * commas do not split prematurely.
 */
function splitMembers(body) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}' || ch === '>') depth -= 1;
    else if ((ch === ';' || ch === '\n') && depth === 0) {
      out.push(body.slice(start, i));
      start = i + 1;
    }
  }
  out.push(body.slice(start));
  return out;
}

/**
 * Parse a single member declaration into either:
 *   { kind: 'method', name, params, returns, optional? }
 *   { kind: 'field',  name, type, optional }
 * or null if the text is empty / unparseable.
 */
function parseMember(text) {
  // Leading identifier (the member name), optionally followed by `?`.
  const nameMatch = /^([A-Za-z_$][\w$]*)(\?)?/.exec(text);
  if (!nameMatch) return null;
  const name = nameMatch[1];
  const optional = nameMatch[2] === '?';
  const rest = text.slice(nameMatch[0].length).trimStart();

  if (rest.startsWith('(')) {
    // Method signature.
    const closeIdx = matchingParen(rest, 0);
    if (closeIdx === -1) return null;
    const paramList = rest.slice(1, closeIdx);
    const after = rest.slice(closeIdx + 1).trimStart();
    if (!after.startsWith(':')) return null;
    const returns = after.slice(1).trim();
    const params = [];
    for (const chunk of splitTopLevel(paramList, ',')) {
      const p = parseParam(chunk.trim());
      if (p) params.push(p);
    }
    return { kind: 'method', name, params, returns, optional };
  }

  if (rest.startsWith(':')) {
    // Field declaration.
    const type = rest.slice(1).trim();
    if (type === '') return null;
    return { kind: 'field', name, type, optional };
  }

  return null;
}

function matchingParen(text, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function parseParam(chunk) {
  if (chunk === '') return null;
  const m = /^([A-Za-z_$][\w$]*)(\??)\s*:\s*(.+)$/s.exec(chunk);
  if (!m) return null;
  const [, name, q, rawType] = m;
  const entry = { name, type: rawType.trim().replace(/\s+/g, ' ') };
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

function parserError(message) {
  return new Error(`types-d-parser: ${message}`);
}
