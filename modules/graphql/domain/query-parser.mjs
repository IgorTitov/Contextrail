/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Minimal GraphQL query parser — a closed subset covering named fields, literal scalar args, and nested selection sets.
 * @sidecar query-parser.mjs.header.md
 * @layer domain | @hex _none_ | @ctx graphql
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';
import {
  matchKeyword,
  readName,
  readScalarValue,
  rejectUnsupported,
  skipWhitespace,
} from './query-tokens.mjs';

/**
 * Minimal GraphQL query parser — a closed subset of the real grammar.
 *
 * Supported:
 *   - optional `query { ... }` or `mutation { ... }` wrapper
 *   - anonymous `{ ... }` selection set
 *   - named fields
 *   - literal arguments: string `"..."`, number `123` / `-1.5`, boolean `true` / `false`
 *   - nested selection sets
 *
 * Explicitly NOT supported (rejected with a clear message):
 *   - fragments `...FragName` / `... on Type`
 *   - variables `$name`
 *   - directives `@skip` / `@include`
 *   - aliases
 *
 * Low-level character scanning lives in `./query-tokens.mjs`; this file
 * owns only the structural recursive-descent layer.
 *
 * @typedef {object} Argument
 * @property {string} name
 * @property {string | number | boolean} value
 *
 * @typedef {object} FieldNode
 * @property {'Field'} kind
 * @property {string} name
 * @property {Argument[]} args
 * @property {FieldNode[]} selections
 *
 * @typedef {object} QueryAst
 * @property {'Query'} kind
 * @property {'query'|'mutation'} operation
 * @property {FieldNode[]} selections
 */

/**
 * Parse a GraphQL query string into a {@link QueryAst}. The parser is a
 * hand-written recursive-descent reader over character positions — no
 * tokenizer pipeline, no regex grammar — so the supported subset stays
 * easy to reason about.
 *
 * @param {string} source
 * @returns {QueryAst}
 */
export function parseQuery(source) {
  if (typeof source !== 'string' || source.trim().length === 0) {
    throw new TypeError(t('graphql.parse.invalid'));
  }

  const state = { src: source, pos: 0 };
  skipWhitespace(state);

  /** @type {'query'|'mutation'} */
  let operation = 'query';
  if (matchKeyword(state, 'query')) {
    operation = 'query';
    skipWhitespace(state);
  } else if (matchKeyword(state, 'mutation')) {
    operation = 'mutation';
    skipWhitespace(state);
  }

  if (state.src[state.pos] !== '{') {
    throw new SyntaxError(t('graphql.parse.expected_selection_set'));
  }
  const selections = parseSelectionSet(state);
  return { kind: 'Query', operation, selections };
}

/**
 * @param {{ src: string, pos: number }} state
 * @returns {FieldNode[]}
 */
function parseSelectionSet(state) {
  // Consume '{'
  state.pos += 1;
  skipWhitespace(state);
  /** @type {FieldNode[]} */
  const selections = [];
  while (state.pos < state.src.length && state.src[state.pos] !== '}') {
    rejectUnsupported(state);
    selections.push(parseField(state));
    skipWhitespace(state);
    // Optional comma separator
    if (state.src[state.pos] === ',') {
      state.pos += 1;
      skipWhitespace(state);
    }
  }
  if (state.src[state.pos] !== '}') {
    throw new SyntaxError(t('graphql.parse.unterminated_selection'));
  }
  state.pos += 1; // consume '}'
  return selections;
}

/**
 * @param {{ src: string, pos: number }} state
 * @returns {FieldNode}
 */
function parseField(state) {
  const start = state.pos;
  const name = readName(state);
  if (!name) {
    throw new SyntaxError(t('graphql.parse.expected_field_name', { pos: start }));
  }
  skipWhitespace(state);
  /** @type {Argument[]} */
  let args = [];
  if (state.src[state.pos] === '(') {
    args = parseArgs(state);
    skipWhitespace(state);
  }
  /** @type {FieldNode[]} */
  let selections = [];
  if (state.src[state.pos] === '{') {
    selections = parseSelectionSet(state);
  }
  return { kind: 'Field', name, args, selections };
}

/**
 * @param {{ src: string, pos: number }} state
 * @returns {Argument[]}
 */
function parseArgs(state) {
  state.pos += 1; // consume '('
  skipWhitespace(state);
  /** @type {Argument[]} */
  const args = [];
  while (state.pos < state.src.length && state.src[state.pos] !== ')') {
    const name = readName(state);
    if (!name) {
      throw new SyntaxError(t('graphql.parse.expected_field_name', { pos: state.pos }));
    }
    skipWhitespace(state);
    if (state.src[state.pos] !== ':') {
      throw new SyntaxError(t('graphql.parse.invalid_arg_value', { pos: state.pos }));
    }
    state.pos += 1; // consume ':'
    skipWhitespace(state);
    const value = readScalarValue(state);
    args.push({ name, value });
    skipWhitespace(state);
    if (state.src[state.pos] === ',') {
      state.pos += 1;
      skipWhitespace(state);
    }
  }
  if (state.src[state.pos] !== ')') {
    throw new SyntaxError(t('graphql.parse.unterminated_args'));
  }
  state.pos += 1; // consume ')'
  return args;
}
