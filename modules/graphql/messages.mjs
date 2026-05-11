/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the graphql module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx graphql
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the graphql module.
 * All user-facing copy from graphql flows through this layer.
 */

const locales = {
  en: {
    'graphql.schema.invalid': 'graphql schema input must be a non-null object.',
    'graphql.schema.invalid_types':
      'graphql schema "types" must be a non-null object of type name → type definition.',
    'graphql.schema.invalid_type':
      'graphql schema type "{name}" must have a non-null "fields" object.',
    'graphql.schema.invalid_field':
      'graphql schema field "{type}.{field}" must have a "type" string.',
    'graphql.schema.invalid_resolver':
      'graphql schema field "{type}.{field}" resolver must be a function when provided.',
    'graphql.schema.invalid_root':
      'graphql schema "{root}" must be a non-null object of field name → field definition.',
    'graphql.schema.unknown_type_ref':
      'graphql schema field "{type}.{field}" references unknown type "{ref}".',

    'graphql.parse.invalid': 'graphql query must be a non-empty string.',
    'graphql.parse.expected_selection_set':
      'graphql parser expected a selection set starting with "{".',
    'graphql.parse.expected_field_name': 'graphql parser expected a field name at position {pos}.',
    'graphql.parse.unterminated_string':
      'graphql parser hit an unterminated string literal at position {pos}.',
    'graphql.parse.unterminated_selection':
      'graphql parser hit an unterminated selection set — missing closing "}".',
    'graphql.parse.unterminated_args':
      'graphql parser hit an unterminated argument list — missing closing ")".',
    'graphql.parse.invalid_arg_value':
      'graphql parser expected a string, number, or boolean argument value at position {pos}.',
    'graphql.parse.unsupported_fragment':
      'graphql parser does not support fragments (...) — this is a minimal subset.',
    'graphql.parse.unsupported_variable':
      'graphql parser does not support variables ($name) — this is a minimal subset.',
    'graphql.parse.unsupported_directive':
      'graphql parser does not support directives (@name) — this is a minimal subset.',

    'graphql.execute.invalid_ast':
      'graphql executor received an invalid AST — expected a Query node with "selections".',
    'graphql.execute.unknown_root':
      'graphql executor could not find root field "{name}" on the schema.',

    'graphql.transport.not_object': 'graphql transport adapter must be a non-null object.',
    'graphql.transport.missing_handleQuery':
      'graphql transport adapter must implement handleQuery(rawQuery, context).',
  },
};

let currentLocale = 'en';

/** @param {string} locale */
export function setLocale(locale) {
  if (!locales[locale]) {
    throw new Error(`Unknown locale: ${locale}`);
  }
  currentLocale = locale;
}

/** @returns {string} */
export function getLocale() {
  return currentLocale;
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const template = locales[currentLocale]?.[key];
  if (template == null) return key;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

/**
 * @param {string} locale
 * @param {Record<string, string>} messages
 */
export function registerLocale(locale, messages) {
  locales[locale] = { ...(locales[locale] || {}), ...messages };
}

export function resetLocale() {
  currentLocale = 'en';
}
