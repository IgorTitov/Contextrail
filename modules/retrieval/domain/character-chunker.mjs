/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Character Chunker domain logic for the retrieval module.
 * @sidecar character-chunker.mjs.header.md
 * @layer module | @hex domain | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Character-level sliding-window chunker.
 * Splits text into overlapping chunks of fixed size.
 *
 * SpecRefs: TPL-088; TPL-099
 *
 * @typedef {import('../types.d.ts').RetrievalChunk} RetrievalChunk
 * @typedef {import('../types.d.ts').ChunkerOptions} ChunkerOptions
 */

/**
 * @param {ChunkerOptions} [options]
 * @returns {{ chunk: (text: string, documentId: string) => RetrievalChunk[] }}
 */
export function createCharacterChunker(options = {}) {
  const chunkSize = options.chunkSize ?? 512;
  const chunkOverlap = options.chunkOverlap ?? 64;
  const step = Math.max(1, chunkSize - chunkOverlap);

  return {
    /**
     * @param {string} text
     * @param {string} documentId
     * @returns {RetrievalChunk[]}
     */
    chunk(text, documentId) {
      if (!text || text.length === 0) return [];

      /** @type {RetrievalChunk[]} */
      const chunks = [];
      let offset = 0;
      let chunkIndex = 0;

      while (offset < text.length) {
        const end = Math.min(offset + chunkSize, text.length);
        chunks.push({
          documentId,
          chunkIndex,
          content: text.slice(offset, end),
          startOffset: offset,
          endOffset: end,
          metadata: {},
        });
        chunkIndex++;
        offset += step;
        if (end === text.length) break;
      }

      return chunks;
    },
  };
}

/** Backward-compatible alias for createCharacterChunker. */
export const createChunker = createCharacterChunker;
