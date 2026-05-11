/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide the bounded i18n layer for the retrieval module, supplying error strings consumed by all port assertions and retrieval adapters.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the retrieval module.
 * All user-facing copy from retrieval adapters and utilities flows through this layer.
 *
 * SpecRefs: TPL-087
 */

const locales = {
  en: {
    'retrieval.error.port_not_object': 'RetrievalPort adapter must be a non-null object',
    'retrieval.error.port_missing_method': 'RetrievalPort adapter must implement {method}()',
    'retrieval.error.embedding_missing': 'Document "{id}" must include metadata.embedding',
    'retrieval.error.embedding_dimension':
      'Embedding dimension mismatch: expected {expected}, got {actual}',
    'retrieval.error.query_embedding_required': 'search() requires options.queryEmbedding',
    'retrieval.error.query_embedding_dimension':
      'Query embedding dimension mismatch: expected {expected}, got {actual}',
    'retrieval.error.chunker_port_not_object': 'ChunkerPort adapter must be a non-null object',
    'retrieval.error.chunker_port_missing_chunk': 'ChunkerPort adapter must implement chunk()',
    'retrieval.error.tokenizer_port_not_object': 'TokenizerPort adapter must be a non-null object',
    'retrieval.error.tokenizer_port_missing_method':
      'TokenizerPort adapter must implement {method}()',
    'retrieval.error.embedder_port_not_object': 'EmbedderPort adapter must be a non-null object',
    'retrieval.error.embedder_port_missing_embed': 'EmbedderPort adapter must implement embed()',
    'retrieval.error.reranker_port_not_object': 'ReRankerPort adapter must be a non-null object',
    'retrieval.error.reranker_port_missing_rerank': 'ReRankerPort adapter must implement rerank()',
    'retrieval.error.loader_port_not_object':
      'DocumentLoaderPort adapter must be a non-null object',
    'retrieval.error.loader_port_missing_load': 'DocumentLoaderPort adapter must implement load()',
    'retrieval.error.transformer_port_not_object':
      'QueryTransformerPort adapter must be a non-null object',
    'retrieval.error.transformer_port_missing_transform':
      'QueryTransformerPort adapter must implement transform()',
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
