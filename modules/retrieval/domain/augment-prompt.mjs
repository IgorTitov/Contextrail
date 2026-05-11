/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide the createAugmentPrompt domain factory that formats retrieved results as a context-augmented prompt string for LLM consumption, respecting a configurable maxContextLength budget.
 * @sidecar augment-prompt.mjs.header.md
 * @layer module | @hex domain | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * augmentPrompt domain pipeline.
 * Formats retrieved results as a context-augmented prompt string for LLM consumption.
 *
 * SpecRefs: TPL-091; TPL-107
 *
 * @typedef {import('../types.d.ts').RetrievalResult} RetrievalResult
 * @typedef {import('../types.d.ts').AugmentPromptOptions} AugmentPromptOptions
 * @typedef {import('../types.d.ts').TokenizerPort} TokenizerPort
 */

const DEFAULT_TEMPLATE =
  'Use the following context to answer the question.\n\n' +
  '---\n{{context}}\n---\n\n' +
  'Question: {{query}}';

/**
 * @param {AugmentPromptOptions} [options]
 * @returns {{ augment: (query: string, results: RetrievalResult[]) => string }}
 */
export function createAugmentPrompt(options = {}) {
  const maxContextLength = options.maxContextLength ?? 4000;
  const template = options.template ?? DEFAULT_TEMPLATE;
  const separator = options.separator ?? '\n';
  const includeMetadata = options.includeMetadata ?? false;
  /** @type {TokenizerPort | null} */
  const tokenizer = options.tokenizer ?? null;
  const maxContextTokens = options.maxContextTokens ?? null;

  /**
   * Measure length in characters or tokens.
   * @param {string} text
   * @returns {number}
   */
  function measure(text) {
    if (tokenizer && maxContextTokens != null) {
      return tokenizer.countTokens(text);
    }
    return text.length;
  }

  /**
   * Get the context budget.
   * @returns {number}
   */
  function budget() {
    if (tokenizer && maxContextTokens != null) return maxContextTokens;
    return maxContextLength;
  }

  return {
    /**
     * @param {string} query
     * @param {RetrievalResult[]} results
     * @returns {string}
     */
    augment(query, results) {
      if (!results || results.length === 0) {
        return template.replace('{{context}}', '').replace('{{query}}', query);
      }

      // Sort by score descending (highest first)
      const sorted = [...results].sort((a, b) => b.score - a.score);

      // Build context by adding results until budget exhausted
      const contextParts = [];
      let currentSize = 0;
      const limit = budget();

      for (const r of sorted) {
        let part = r.content;
        if (includeMetadata && r.metadata && Object.keys(r.metadata).length > 0) {
          const metaStr = Object.entries(r.metadata)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          part = `[${metaStr}]\n${part}`;
        }

        const sepSize = contextParts.length > 0 ? measure(separator) : 0;
        const partSize = measure(part) + sepSize;
        if (currentSize + partSize > limit && contextParts.length > 0) {
          break;
        }

        contextParts.push(part);
        currentSize += partSize;
      }

      const context = contextParts.join(separator);
      return template.replace('{{context}}', context).replace('{{query}}', query);
    },
  };
}
