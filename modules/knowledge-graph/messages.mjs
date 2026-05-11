/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the knowledge-graph module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx knowledge-graph
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the knowledge-graph module.
 * SpecRefs: TPL-114
 */

const locales = {
  en: {
    'knowledge-graph.error.graph_store_port_not_object':
      'GraphStorePort adapter must be a non-null object',
    'knowledge-graph.error.graph_store_port_missing_method':
      'GraphStorePort adapter must implement {method}()',
    'knowledge-graph.error.entity_extractor_port_not_object':
      'EntityExtractorPort adapter must be a non-null object',
    'knowledge-graph.error.entity_extractor_port_missing_method':
      'EntityExtractorPort adapter must implement extractEntities()',
    'knowledge-graph.error.relationship_extractor_port_not_object':
      'RelationshipExtractorPort adapter must be a non-null object',
    'knowledge-graph.error.relationship_extractor_port_missing_method':
      'RelationshipExtractorPort adapter must implement extractRelationships()',
  },
};

let currentLocale = 'en';

/** @param {string} locale */
export function setLocale(locale) {
  if (!locales[locale]) throw new Error(`Unknown locale: ${locale}`);
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

/** @param {string} locale @param {Record<string, string>} messages */
export function registerLocale(locale, messages) {
  locales[locale] = { ...(locales[locale] || {}), ...messages };
}

export function resetLocale() {
  currentLocale = 'en';
}
