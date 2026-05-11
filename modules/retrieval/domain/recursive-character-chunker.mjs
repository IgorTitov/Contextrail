/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Recursive Character Chunker domain logic for the retrieval module.
 * @sidecar recursive-character-chunker.mjs.header.md
 * @layer module | @hex domain | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Recursive character chunker.
 * Splits text using a hierarchy of separators, falling back to the next
 * separator when a chunk exceeds the target size.
 *
 * SpecRefs: TPL-100
 *
 * @typedef {import('../types.d.ts').RetrievalChunk} RetrievalChunk
 */

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ' '];

/**
 * @param {{ chunkSize?: number, separators?: string[] }} [options]
 * @returns {{ chunk: (text: string, documentId: string) => RetrievalChunk[] }}
 */
export function createRecursiveCharacterChunker(options = {}) {
  const chunkSize = options.chunkSize ?? 512;
  const separators = options.separators ?? DEFAULT_SEPARATORS;

  /**
   * Recursively split text using the separator hierarchy.
   * @param {string} text
   * @param {number} sepIdx
   * @returns {string[]}
   */
  function splitRecursive(text, sepIdx) {
    if (text.length <= chunkSize) return [text];
    if (sepIdx >= separators.length) {
      // Hard cut — no separator left
      const parts = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        parts.push(text.slice(i, i + chunkSize));
      }
      return parts;
    }

    const sep = separators[sepIdx];
    const segments = text.split(sep);
    const result = [];
    let buffer = '';

    for (const seg of segments) {
      const candidate = buffer ? buffer + sep + seg : seg;
      if (candidate.length <= chunkSize) {
        buffer = candidate;
      } else {
        if (buffer) result.push(buffer);
        // seg itself might be too long — recurse with next separator
        if (seg.length > chunkSize) {
          result.push(...splitRecursive(seg, sepIdx + 1));
          buffer = '';
        } else {
          buffer = seg;
        }
      }
    }
    if (buffer) result.push(buffer);
    return result;
  }

  return {
    /** @param {string} text @param {string} documentId @returns {RetrievalChunk[]} */
    chunk(text, documentId) {
      if (!text || text.length === 0) return [];

      const parts = splitRecursive(text, 0).filter((p) => p.trim().length > 0);

      let offset = 0;
      return parts.map((content, chunkIndex) => {
        const startOffset = text.indexOf(content, offset);
        const actualStart = startOffset >= 0 ? startOffset : offset;
        const endOffset = actualStart + content.length;
        offset = actualStart + 1;
        return {
          documentId,
          chunkIndex,
          content,
          startOffset: actualStart,
          endOffset,
          metadata: {},
        };
      });
    },
  };
}
