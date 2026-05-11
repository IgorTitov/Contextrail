/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the search module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx search
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the search module.
 * All user-facing copy from search flows through this layer.
 */

const locales = {
  en: {
    'search.port.not_object': 'Search adapter must be a non-null object.',
    'search.port.missing_index': 'Search adapter must implement index(document).',
    'search.port.missing_indexBatch': 'Search adapter must implement indexBatch(documents).',
    'search.port.missing_search': 'Search adapter must implement search(query, options?).',
    'search.port.missing_remove': 'Search adapter must implement remove(id).',
    'search.port.missing_clear': 'Search adapter must implement clear().',
    'search.document.invalid': 'search document must be a non-null object.',
    'search.document.missing_id': 'search document "id" must be a non-empty string.',
    'search.document.missing_fields':
      'search document "fields" must be a non-empty object of string values.',
    'search.document.invalid_field': 'search document field "{name}" must be a string.',
    'search.document.invalid_facet': 'search document facet "{name}" must be a string or string[].',
    'search.query.invalid': 'search query must be a non-empty string.',
    'search.options.invalid_limit': 'search option "limit" must be a positive integer.',
    'search.options.invalid_offset': 'search option "offset" must be a non-negative integer.',
    'search.options.invalid_filter':
      'search option "filters" must be an object of string/string[] values.',
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
