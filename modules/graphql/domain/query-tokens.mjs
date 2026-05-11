/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Low-level character scanners for the GraphQL query parser — names, scalar literals, keywords, whitespace, and unsupported-syntax rejection.
 * @sidecar query-tokens.mjs.header.md
 * @layer domain | @hex _none_ | @ctx graphql
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Cursor state shared by every scanner: the source string and the current
 * read position. Scanners advance `pos` in place; the parser composes them.
 *
 * @typedef {{ src: string, pos: number }} ScanState
 */

/**
 * Read a literal scalar value at the current position. Supports strings,
 * numbers (integer + decimal, optional sign), and the `true` / `false`
 * boolean keywords. Variables (`$name`) are rejected with a subset-specific
 * error rather than producing a confusing lower-level failure.
 *
 * @param {ScanState} state
 * @returns {string | number | boolean}
 */
export function readScalarValue(state) {
  const ch = state.src[state.pos];
  if (ch === '$') {
    throw new SyntaxError(t('graphql.parse.unsupported_variable'));
  }
  if (ch === '"') {
    return readString(state);
  }
  if (ch === '-' || (ch >= '0' && ch <= '9')) {
    return readNumber(state);
  }
  if (matchKeyword(state, 'true')) return true;
  if (matchKeyword(state, 'false')) return false;
  throw new SyntaxError(t('graphql.parse.invalid_arg_value', { pos: state.pos }));
}

/**
 * Read a double-quoted string literal. Supports `\n`, `\t`, and a generic
 * single-character escape; throws on an unterminated string.
 *
 * @param {ScanState} state
 * @returns {string}
 */
export function readString(state) {
  const start = state.pos;
  state.pos += 1; // consume opening '"'
  let out = '';
  while (state.pos < state.src.length) {
    const ch = state.src[state.pos];
    if (ch === '"') {
      state.pos += 1;
      return out;
    }
    if (ch === '\\' && state.pos + 1 < state.src.length) {
      const next = state.src[state.pos + 1];
      out += next === 'n' ? '\n' : next === 't' ? '\t' : next;
      state.pos += 2;
      continue;
    }
    out += ch;
    state.pos += 1;
  }
  throw new SyntaxError(t('graphql.parse.unterminated_string', { pos: start }));
}

/**
 * Read a numeric literal — optional leading minus, integer part, optional
 * fractional part. Returns a JavaScript number; throws on a malformed read.
 *
 * @param {ScanState} state
 * @returns {number}
 */
export function readNumber(state) {
  const start = state.pos;
  if (state.src[state.pos] === '-') state.pos += 1;
  while (state.pos < state.src.length && /[0-9]/.test(state.src[state.pos])) state.pos += 1;
  if (state.src[state.pos] === '.') {
    state.pos += 1;
    while (state.pos < state.src.length && /[0-9]/.test(state.src[state.pos])) state.pos += 1;
  }
  const raw = state.src.slice(start, state.pos);
  const num = Number(raw);
  if (Number.isNaN(num)) {
    throw new SyntaxError(t('graphql.parse.invalid_arg_value', { pos: start }));
  }
  return num;
}

/**
 * Read an identifier-shaped name (`[A-Za-z0-9_]+`). Returns the empty
 * string if the cursor is not on a name character — callers decide
 * whether that is an error in context.
 *
 * @param {ScanState} state
 * @returns {string}
 */
export function readName(state) {
  const start = state.pos;
  while (state.pos < state.src.length && /[A-Za-z0-9_]/.test(state.src[state.pos])) {
    state.pos += 1;
  }
  return state.src.slice(start, state.pos);
}

/**
 * Match a literal keyword followed by a non-name character (so that `query`
 * does not match the start of `queryUsers`). Advances the cursor on match.
 *
 * @param {ScanState} state
 * @param {string} keyword
 * @returns {boolean}
 */
export function matchKeyword(state, keyword) {
  if (state.src.slice(state.pos, state.pos + keyword.length) !== keyword) return false;
  const after = state.src[state.pos + keyword.length];
  if (after != null && /[A-Za-z0-9_]/.test(after)) return false;
  state.pos += keyword.length;
  return true;
}

/**
 * Skip whitespace, commas (insignificant in GraphQL), and `#` line comments.
 *
 * @param {ScanState} state
 */
export function skipWhitespace(state) {
  while (state.pos < state.src.length) {
    const ch = state.src[state.pos];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ',') {
      state.pos += 1;
      continue;
    }
    // Line comment
    if (ch === '#') {
      while (state.pos < state.src.length && state.src[state.pos] !== '\n') state.pos += 1;
      continue;
    }
    break;
  }
}

/**
 * Reject the unsupported syntax (fragments, variables, directives) with
 * a clear, subset-specific error message before the parser gets deep
 * enough to produce a confusing lower-level failure.
 *
 * @param {ScanState} state
 */
export function rejectUnsupported(state) {
  const ch = state.src[state.pos];
  if (ch === '.' && state.src.slice(state.pos, state.pos + 3) === '...') {
    throw new SyntaxError(t('graphql.parse.unsupported_fragment'));
  }
  if (ch === '$') {
    throw new SyntaxError(t('graphql.parse.unsupported_variable'));
  }
  if (ch === '@') {
    throw new SyntaxError(t('graphql.parse.unsupported_directive'));
  }
}
