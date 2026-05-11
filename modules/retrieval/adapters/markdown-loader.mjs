/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Markdown Loader adapter for the retrieval module.
 * @sidecar markdown-loader.mjs.header.md
 * @layer module | @hex adapter | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Markdown document loader adapter.
 * Splits markdown by headings into separate documents.
 *
 * SpecRefs: TPL-123
 *
 * @typedef {import('../types.d.ts').DocumentLoaderPort} DocumentLoaderPort
 * @typedef {import('../types.d.ts').RetrievalDocument} RetrievalDocument
 */

let idCounter = 0;

/**
 * Create a markdown loader that splits content by headings.
 *
 * @returns {DocumentLoaderPort}
 */
export function createMarkdownLoader() {
  return {
    /**
     * @param {string} source
     * @returns {RetrievalDocument[]}
     */
    load(source) {
      if (!source) return [];

      const headingRe = /^(#{1,6})\s+(.+)$/gm;
      /** @type {{heading: string; level: number; startIdx: number}[]} */
      const headings = [];
      let match;
      while ((match = headingRe.exec(source)) !== null) {
        headings.push({
          heading: match[2].trim(),
          level: match[1].length,
          startIdx: match.index,
        });
      }

      if (headings.length === 0) {
        return [
          { id: `loader-md-${++idCounter}-${Date.now()}`, content: source.trim(), metadata: {} },
        ];
      }

      /** @type {RetrievalDocument[]} */
      const docs = [];

      // Text before the first heading
      if (headings[0].startIdx > 0) {
        const pre = source.slice(0, headings[0].startIdx).trim();
        if (pre) {
          docs.push({ id: `loader-md-${++idCounter}-${Date.now()}`, content: pre, metadata: {} });
        }
      }

      for (let i = 0; i < headings.length; i++) {
        const start = headings[i].startIdx;
        const end = i + 1 < headings.length ? headings[i + 1].startIdx : source.length;
        const content = source.slice(start, end).trim();
        if (content) {
          docs.push({
            id: `loader-md-${++idCounter}-${Date.now()}`,
            content,
            metadata: {
              heading: headings[i].heading,
              title: headings[i].heading,
              headingLevel: headings[i].level,
            },
          });
        }
      }

      return docs;
    },
  };
}
