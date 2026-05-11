/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure GraphQL executor — walks a parsed QueryAst against a Schema, invokes resolvers, aggregates errors.
 * @sidecar executor.mjs.header.md
 * @layer domain | @hex _none_ | @ctx graphql
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';
import { stripTypeDecoration, isBuiltinScalar } from './schema.mjs';

/**
 * Pure GraphQL executor. Walks a {@link QueryAst} against a {@link Schema},
 * invokes each matched resolver, and aggregates both data and errors into
 * a single result shape `{ data, errors }`. No I/O, no thrown exceptions
 * for resolver failures — they are captured into `errors` with the path
 * at which they occurred.
 *
 * Resolvers may be synchronous or asynchronous; the executor awaits
 * every result so callers can return Promises. Missing resolvers on
 * non-root fields fall back to plain property access on the parent
 * object (the `trivial-resolver` behavior of the real spec).
 *
 * @typedef {import('./query-parser.mjs').QueryAst} QueryAst
 * @typedef {import('./query-parser.mjs').FieldNode} FieldNode
 * @typedef {import('./schema.mjs').Schema} Schema
 * @typedef {import('./schema.mjs').FieldDefinition} FieldDefinition
 *
 * @typedef {object} ExecutionError
 * @property {string} message
 * @property {string[]} path
 *
 * @typedef {object} ExecutionResult
 * @property {Record<string, unknown> | null} data
 * @property {ExecutionError[]} errors
 */

/**
 * Execute a parsed query against a schema.
 *
 * @param {Schema} schema
 * @param {QueryAst} queryAst
 * @param {unknown} [context]
 * @returns {Promise<ExecutionResult>}
 */
export async function executeQuery(schema, queryAst, context) {
  if (!queryAst || queryAst.kind !== 'Query' || !Array.isArray(queryAst.selections)) {
    throw new TypeError(t('graphql.execute.invalid_ast'));
  }
  /** @type {Record<string, unknown>} */
  const data = {};
  /** @type {ExecutionError[]} */
  const errors = [];

  const rootMap = queryAst.operation === 'mutation' ? schema.mutations : schema.queries;

  for (const selection of queryAst.selections) {
    const fieldDef = rootMap[selection.name];
    if (!fieldDef) {
      errors.push({
        message: t('graphql.execute.unknown_root', { name: selection.name }),
        path: [selection.name],
      });
      data[selection.name] = null;
      continue;
    }
    data[selection.name] = await resolveField(
      schema,
      fieldDef,
      selection,
      /* parent */ null,
      context,
      [selection.name],
      errors,
    );
  }

  return { data, errors };
}

/**
 * Resolve a single field. Invokes the resolver if present; falls back to
 * trivial parent-property access otherwise. Walks nested selection sets
 * for object types.
 *
 * @param {Schema} schema
 * @param {FieldDefinition} fieldDef
 * @param {FieldNode} node
 * @param {unknown} parent
 * @param {unknown} context
 * @param {string[]} path
 * @param {ExecutionError[]} errors
 * @returns {Promise<unknown>}
 */
async function resolveField(schema, fieldDef, node, parent, context, path, errors) {
  const args = argsToObject(node.args);
  /** @type {unknown} */
  let value;
  try {
    if (typeof fieldDef.resolver === 'function') {
      value = await fieldDef.resolver(parent, args, context);
    } else if (parent && typeof parent === 'object') {
      value = /** @type {Record<string, unknown>} */ (parent)[node.name];
    } else {
      value = null;
    }
  } catch (err) {
    errors.push({
      message: err instanceof Error ? err.message : String(err),
      path,
    });
    return null;
  }

  const baseType = stripTypeDecoration(fieldDef.type);

  // Leaf scalar — return the value as-is (even if selections were requested,
  // the minimal subset ignores them on scalars).
  if (isBuiltinScalar(baseType) || node.selections.length === 0) {
    return value;
  }

  // Object type with a nested selection set — walk each child field.
  const typeDef = schema.types[baseType];
  if (!typeDef) return value;

  if (Array.isArray(value)) {
    /** @type {unknown[]} */
    const out = [];
    for (let i = 0; i < value.length; i += 1) {
      out.push(
        await walkObject(
          schema,
          typeDef.fields,
          node.selections,
          value[i],
          context,
          [...path, String(i)],
          errors,
        ),
      );
    }
    return out;
  }

  if (value == null) return null;
  return walkObject(schema, typeDef.fields, node.selections, value, context, path, errors);
}

/**
 * Walk a selection set over an object value.
 *
 * @param {Schema} schema
 * @param {Record<string, FieldDefinition>} fields
 * @param {FieldNode[]} selections
 * @param {unknown} parent
 * @param {unknown} context
 * @param {string[]} path
 * @param {ExecutionError[]} errors
 * @returns {Promise<Record<string, unknown>>}
 */
async function walkObject(schema, fields, selections, parent, context, path, errors) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const selection of selections) {
    const fieldDef = fields[selection.name];
    if (!fieldDef) {
      errors.push({
        message: t('graphql.execute.unknown_root', { name: selection.name }),
        path: [...path, selection.name],
      });
      out[selection.name] = null;
      continue;
    }
    out[selection.name] = await resolveField(
      schema,
      fieldDef,
      selection,
      parent,
      context,
      [...path, selection.name],
      errors,
    );
  }
  return out;
}

/**
 * Convert a parser Arguments list into a plain object.
 *
 * @param {import('./query-parser.mjs').Argument[]} args
 * @returns {Record<string, unknown>}
 */
function argsToObject(args) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const arg of args) out[arg.name] = arg.value;
  return out;
}
