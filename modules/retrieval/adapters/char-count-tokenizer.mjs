/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Char Count Tokenizer adapter for the retrieval module.
 * @sidecar char-count-tokenizer.mjs.header.md
 * @layer module | @hex adapter | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Character-count tokenizer — treats each character as one token.
 * Zero-dependency default tokenizer.
 *
 * SpecRefs: TPL-105
 */

/**
 * @returns {import('../types.d.ts').TokenizerPort}
 */
export function createCharCountTokenizer() {
  return {
    /** @param {string} text @returns {number} */
    countTokens(text) {
      return text.length;
    },
    /** @param {string} text @param {number} maxTokens @returns {string} */
    truncateToTokens(text, maxTokens) {
      if (text.length <= maxTokens) return text;
      return text.slice(0, maxTokens);
    },
  };
}
