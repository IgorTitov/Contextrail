/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Multi Query Transformer adapter for the retrieval module.
 * @sidecar multi-query-transformer.mjs.header.md
 * @layer module | @hex adapter | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Multi-query transformer adapter.
 * Expands a single query into multiple variants using templates.
 *
 * SpecRefs: TPL-127
 *
 * @typedef {import('../types.d.ts').QueryTransformerPort} QueryTransformerPort
 * @typedef {import('../types.d.ts').MultiQueryTransformerOptions} MultiQueryTransformerOptions
 */

/** @type {string[]} */
const DEFAULT_TEMPLATES = ['{query}', 'Explain: {query}', 'What are the key aspects of: {query}'];

/**
 * Create a multi-query transformer that expands queries into variants.
 *
 * @param {MultiQueryTransformerOptions} [options]
 * @returns {QueryTransformerPort}
 */
export function createMultiQueryTransformer(options = {}) {
  const templates = options.templates || DEFAULT_TEMPLATES;

  return {
    /**
     * @param {string} query
     * @returns {string[]}
     */
    transform(query) {
      const variants = templates.map((tpl) => tpl.replace('{query}', query));

      // Always include the original query
      if (!variants.includes(query)) {
        variants.unshift(query);
      }

      return variants;
    },
  };
}
