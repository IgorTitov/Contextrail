/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Approx Tiktoken Tokenizer adapter for the retrieval module.
 * @sidecar approx-tiktoken-tokenizer.mjs.header.md
 * @layer module | @hex adapter | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Approximate tiktoken-compatible tokenizer.
 * Heuristic-based estimation: ~4 characters per token for English text.
 * Zero external dependencies.
 *
 * SpecRefs: TPL-106
 */

/**
 * @param {{ charsPerToken?: number }} [options]
 * @returns {import('../types.d.ts').TokenizerPort}
 */
export function createApproxTiktokenTokenizer(options = {}) {
  const charsPerToken = options.charsPerToken ?? 4;

  return {
    /** @param {string} text @returns {number} */
    countTokens(text) {
      if (!text) return 0;
      return Math.ceil(text.length / charsPerToken);
    },
    /** @param {string} text @param {number} maxTokens @returns {string} */
    truncateToTokens(text, maxTokens) {
      const maxChars = maxTokens * charsPerToken;
      if (text.length <= maxChars) return text;
      return text.slice(0, maxChars);
    },
  };
}
