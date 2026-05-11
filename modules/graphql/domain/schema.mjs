/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure GraphQL schema value object with type/field/resolver validation and root query/mutation fields.
 * @sidecar schema.mjs.header.md
 * @layer domain | @hex _none_ | @ctx graphql
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure GraphQL schema value object. Declares a closed set of types, each
 * with a fields map of `{ type, resolver? }`, plus top-level `queries` and
 * `mutations` maps of root fields. Every field type referenced elsewhere
 * must exist in the schema or be one of the five built-in scalars
 * (`String`, `Int`, `Float`, `Boolean`, `ID`). Pure — no transport, no
 * execution logic.
 *
 * Type strings can carry `!` (non-null) and `[T]` (list) decoration; the
 * validator strips them before resolving the referenced type. The executor
 * ignores decoration in this minimal subset — callers are expected to
 * enforce non-null in their resolvers.
 *
 * @typedef {object} FieldDefinition
 * @property {string} type
 * @property {(parent: unknown, args: Record<string, unknown>, context: unknown) => unknown} [resolver]
 *
 * @typedef {object} TypeDefinition
 * @property {Record<string, FieldDefinition>} fields
 *
 * @typedef {object} Schema
 * @property {Record<string, TypeDefinition>} types
 * @property {Record<string, FieldDefinition>} queries
 * @property {Record<string, FieldDefinition>} mutations
 */

const BUILTIN_SCALARS = new Set(['String', 'Int', 'Float', 'Boolean', 'ID']);

/**
 * Validate and construct a frozen {@link Schema}.
 *
 * @param {{
 *   types?: Record<string, TypeDefinition>,
 *   queries?: Record<string, FieldDefinition>,
 *   mutations?: Record<string, FieldDefinition>,
 * }} input
 * @returns {Readonly<Schema>}
 */
export function createSchema(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('graphql.schema.invalid'));
  }
  const types = validateTypes(input.types ?? {});
  const queries = validateRoot(input.queries ?? {}, 'queries');
  const mutations = validateRoot(input.mutations ?? {}, 'mutations');

  // Cross-reference validation — every field type must exist in `types`
  // or be a built-in scalar.
  for (const [typeName, typeDef] of Object.entries(types)) {
    for (const [fieldName, fieldDef] of Object.entries(typeDef.fields)) {
      assertKnownType(fieldDef.type, types, typeName, fieldName);
    }
  }
  for (const [fieldName, fieldDef] of Object.entries(queries)) {
    assertKnownType(fieldDef.type, types, 'Query', fieldName);
  }
  for (const [fieldName, fieldDef] of Object.entries(mutations)) {
    assertKnownType(fieldDef.type, types, 'Mutation', fieldName);
  }

  return Object.freeze({
    types: Object.freeze(types),
    queries: Object.freeze(queries),
    mutations: Object.freeze(mutations),
  });
}

/**
 * @param {unknown} raw
 * @returns {Record<string, TypeDefinition>}
 */
function validateTypes(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError(t('graphql.schema.invalid_types'));
  }
  /** @type {Record<string, TypeDefinition>} */
  const out = {};
  for (const [name, typeDef] of Object.entries(/** @type {Record<string, unknown>} */ (raw))) {
    if (!typeDef || typeof typeDef !== 'object') {
      throw new TypeError(t('graphql.schema.invalid_type', { name }));
    }
    const fields = /** @type {{ fields?: unknown }} */ (typeDef).fields;
    if (!fields || typeof fields !== 'object') {
      throw new TypeError(t('graphql.schema.invalid_type', { name }));
    }
    out[name] = { fields: validateFieldMap(fields, name) };
  }
  return out;
}

/**
 * @param {unknown} raw
 * @param {string} rootName
 * @returns {Record<string, FieldDefinition>}
 */
function validateRoot(raw, rootName) {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError(t('graphql.schema.invalid_root', { root: rootName }));
  }
  return validateFieldMap(raw, rootName);
}

/**
 * @param {unknown} raw
 * @param {string} typeName
 * @returns {Record<string, FieldDefinition>}
 */
function validateFieldMap(raw, typeName) {
  /** @type {Record<string, FieldDefinition>} */
  const out = {};
  for (const [fieldName, fieldDef] of Object.entries(
    /** @type {Record<string, unknown>} */ (raw),
  )) {
    if (!fieldDef || typeof fieldDef !== 'object') {
      throw new TypeError(t('graphql.schema.invalid_field', { type: typeName, field: fieldName }));
    }
    const { type, resolver } = /** @type {{ type?: unknown, resolver?: unknown }} */ (fieldDef);
    if (typeof type !== 'string' || type.length === 0) {
      throw new TypeError(t('graphql.schema.invalid_field', { type: typeName, field: fieldName }));
    }
    if (resolver != null && typeof resolver !== 'function') {
      throw new TypeError(
        t('graphql.schema.invalid_resolver', { type: typeName, field: fieldName }),
      );
    }
    /** @type {FieldDefinition} */
    const def = { type };
    if (typeof resolver === 'function') {
      def.resolver = /** @type {FieldDefinition['resolver']} */ (resolver);
    }
    out[fieldName] = def;
  }
  return out;
}

/**
 * Strip `!` / `[T]` decoration and verify the referenced type is known
 * (either user-defined or a built-in scalar).
 *
 * @param {string} typeRef
 * @param {Record<string, TypeDefinition>} types
 * @param {string} declaringType
 * @param {string} declaringField
 */
function assertKnownType(typeRef, types, declaringType, declaringField) {
  const stripped = stripTypeDecoration(typeRef);
  if (BUILTIN_SCALARS.has(stripped)) return;
  if (types[stripped]) return;
  throw new TypeError(
    t('graphql.schema.unknown_type_ref', {
      type: declaringType,
      field: declaringField,
      ref: stripped,
    }),
  );
}

/**
 * Strip non-null `!` and list `[]` decoration from a type ref.
 *
 * @param {string} typeRef
 * @returns {string}
 */
export function stripTypeDecoration(typeRef) {
  let out = typeRef.trim();
  while (out.endsWith('!')) out = out.slice(0, -1);
  if (out.startsWith('[') && out.endsWith(']')) {
    out = out.slice(1, -1);
    while (out.endsWith('!')) out = out.slice(0, -1);
  }
  return out;
}

/**
 * Check whether a type name is a built-in scalar.
 *
 * @param {string} typeName
 * @returns {boolean}
 */
export function isBuiltinScalar(typeName) {
  return BUILTIN_SCALARS.has(typeName);
}
