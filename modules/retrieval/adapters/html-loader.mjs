/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Html Loader adapter for the retrieval module.
 * @sidecar html-loader.mjs.header.md
 * @layer module | @hex adapter | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * HTML document loader adapter.
 * Strips tags, decodes entities, and collapses whitespace.
 *
 * SpecRefs: TPL-124
 *
 * @typedef {import('../types.d.ts').DocumentLoaderPort} DocumentLoaderPort
 * @typedef {import('../types.d.ts').RetrievalDocument} RetrievalDocument
 */

let idCounter = 0;

/** @type {Record<string, string>} */
const HTML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/**
 * Create an HTML loader that strips tags and decodes basic entities.
 *
 * @returns {DocumentLoaderPort}
 */
export function createHtmlLoader() {
  return {
    /**
     * @param {string} source
     * @returns {RetrievalDocument[]}
     */
    load(source) {
      if (!source) return [];

      // Strip HTML tags
      let text = source.replace(/<[^>]*>/g, ' ');

      // Decode HTML entities
      text = text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
        return HTML_ENTITIES[entity] || entity;
      });

      // Collapse whitespace
      text = text.replace(/\s+/g, ' ').trim();

      if (!text) return [];

      return [{ id: `loader-html-${++idCounter}-${Date.now()}`, content: text, metadata: {} }];
    },
  };
}
