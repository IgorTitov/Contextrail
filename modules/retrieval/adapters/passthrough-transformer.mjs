/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Passthrough Transformer adapter for the retrieval module.
 * @sidecar passthrough-transformer.mjs.header.md
 * @layer module | @hex adapter | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Passthrough query transformer adapter.
 * Returns the query unchanged.
 *
 * SpecRefs: TPL-126
 *
 * @typedef {import('../types.d.ts').QueryTransformerPort} QueryTransformerPort
 */

/**
 * Create a passthrough transformer that returns the query as-is.
 *
 * @returns {QueryTransformerPort}
 */
export function createPassthroughTransformer() {
  return {
    /**
     * @param {string} query
     * @returns {string}
     */
    transform(query) {
      return query;
    },
  };
}
