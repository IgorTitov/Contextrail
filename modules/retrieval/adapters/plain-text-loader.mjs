/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Plain Text Loader adapter for the retrieval module.
 * @sidecar plain-text-loader.mjs.header.md
 * @layer module | @hex adapter | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Plain-text document loader adapter.
 * Wraps raw text as a single RetrievalDocument.
 *
 * SpecRefs: TPL-123
 *
 * @typedef {import('../types.d.ts').DocumentLoaderPort} DocumentLoaderPort
 * @typedef {import('../types.d.ts').RetrievalDocument} RetrievalDocument
 */

let idCounter = 0;

/**
 * Create a plain-text loader that wraps input as a single document.
 *
 * @returns {DocumentLoaderPort}
 */
export function createPlainTextLoader() {
  return {
    /**
     * @param {string} source
     * @returns {RetrievalDocument[]}
     */
    load(source) {
      if (!source) return [];
      return [{ id: `loader-txt-${++idCounter}-${Date.now()}`, content: source, metadata: {} }];
    },
  };
}
