/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Score Threshold Reranker adapter for the retrieval module.
 * @sidecar score-threshold-reranker.mjs.header.md
 * @layer module | @hex adapter | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Score-threshold re-ranker — filters results below a minimum score
 * and sorts by score descending.
 *
 * SpecRefs: TPL-113
 *
 * @typedef {import('../types.d.ts').RetrievalResult} RetrievalResult
 */

/**
 * @param {{ minScore?: number, topK?: number }} [options]
 * @returns {{ rerank: (query: string, results: RetrievalResult[]) => Promise<RetrievalResult[]> }}
 */
export function createScoreThresholdReRanker(options = {}) {
  const minScore = options.minScore ?? 0;
  const topK = options.topK ?? Infinity;

  return {
    /**
     * @param {string} _query
     * @param {RetrievalResult[]} results
     * @returns {Promise<RetrievalResult[]>}
     */
    async rerank(_query, results) {
      return [...results]
        .filter((r) => r.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    },
  };
}
