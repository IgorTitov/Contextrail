/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Sentence Chunker domain logic for the retrieval module.
 * @sidecar sentence-chunker.mjs.header.md
 * @layer module | @hex domain | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Sentence-boundary chunker.
 * Splits text into sentences using punctuation detection with abbreviation
 * awareness, then groups sentences up to maxChunkSize.
 *
 * SpecRefs: TPL-101
 *
 * @typedef {import('../types.d.ts').RetrievalChunk} RetrievalChunk
 */

// Common abbreviations that should NOT be treated as sentence endings
const ABBREVIATIONS = new Set([
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'sr',
  'jr',
  'st',
  'ave',
  'vs',
  'etc',
  'inc',
  'ltd',
  'co',
  'corp',
  'dept',
  'est',
  'approx',
  'govt',
  'no',
  'vol',
  'fig',
  'eq',
  'gen',
  'sgt',
]);

/**
 * Split text into sentences, grouping them up to maxChunkSize.
 *
 * @param {{ maxChunkSize?: number }} [options]
 * @returns {{ chunk: (text: string, documentId: string) => RetrievalChunk[] }}
 */
export function createSentenceChunker(options = {}) {
  const maxChunkSize = options.maxChunkSize ?? 512;

  /**
   * @param {string} text
   * @returns {string[]}
   */
  function splitSentences(text) {
    // Split by sentence-ending punctuation followed by space
    const raw = text.split(/(?<=[.!?])\s+/);
    if (raw.length <= 1) return raw.filter((s) => s.trim().length > 0);

    // Merge back segments that were incorrectly split on abbreviations
    const sentences = [];
    let buffer = '';
    for (const segment of raw) {
      if (buffer) {
        // Check if the previous buffer ends with a known abbreviation
        const words = buffer.split(/\s+/);
        const lastWord = words[words.length - 1];
        const beforeDot = lastWord.replace(/[.!?]+$/, '').toLowerCase();
        if (ABBREVIATIONS.has(beforeDot)) {
          buffer = buffer + ' ' + segment;
          continue;
        }
        sentences.push(buffer);
        buffer = segment;
      } else {
        buffer = segment;
      }
    }
    if (buffer) sentences.push(buffer);

    return sentences.filter((s) => s.trim().length > 0);
  }

  return {
    /** @param {string} text @param {string} documentId @returns {RetrievalChunk[]} */
    chunk(text, documentId) {
      if (!text || text.length === 0) return [];

      const sentences = splitSentences(text);
      /** @type {RetrievalChunk[]} */
      const chunks = [];
      let buffer = '';
      let chunkIndex = 0;
      let offset = 0;

      for (const sentence of sentences) {
        const candidate = buffer ? buffer + ' ' + sentence : sentence;
        if (candidate.length > maxChunkSize && buffer) {
          const startOffset = text.indexOf(buffer, offset);
          const actualStart = startOffset >= 0 ? startOffset : offset;
          chunks.push({
            documentId,
            chunkIndex,
            content: buffer,
            startOffset: actualStart,
            endOffset: actualStart + buffer.length,
            metadata: {},
          });
          chunkIndex++;
          offset = actualStart + 1;
          buffer = sentence;
        } else {
          buffer = candidate;
        }
      }
      if (buffer) {
        const startOffset = text.indexOf(buffer, offset);
        const actualStart = startOffset >= 0 ? startOffset : offset;
        chunks.push({
          documentId,
          chunkIndex,
          content: buffer,
          startOffset: actualStart,
          endOffset: actualStart + buffer.length,
          metadata: {},
        });
      }
      return chunks;
    },
  };
}
