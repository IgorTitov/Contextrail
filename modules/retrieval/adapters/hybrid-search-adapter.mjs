/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Hybrid Search adapter for the retrieval module.
 * @sidecar hybrid-search-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Hybrid search adapter — merges results from multiple RetrievalPort sources
 * using Reciprocal Rank Fusion (RRF).
 *
 * SpecRefs: TPL-110
 *
 * @typedef {import('../types.d.ts').RetrievalPort} RetrievalPort
 * @typedef {import('../types.d.ts').RetrievalDocument} RetrievalDocument
 * @typedef {import('../types.d.ts').RetrievalResult} RetrievalResult
 * @typedef {import('../types.d.ts').RetrievalSearchOptions} RetrievalSearchOptions
 */

const DEFAULT_K = 60; // RRF constant

/**
 * @param {{ sources: RetrievalPort[], k?: number }} options
 * @returns {RetrievalPort}
 */
export function createHybridSearchAdapter(options) {
  const sources = options.sources ?? [];
  const k = options.k ?? DEFAULT_K;

  return {
    async addDocuments(docs) {
      const allIds = await Promise.all(sources.map((s) => s.addDocuments(docs)));
      return allIds[0] ?? [];
    },

    async search(query, searchOpts) {
      if (sources.length === 0) return [];

      const topK = searchOpts?.topK ?? 5;
      // Run all sources in parallel
      const allResults = await Promise.all(
        sources.map((s) => s.search(query, { ...searchOpts, topK: topK * 2 })),
      );

      return fuseRRF(
        allResults,
        sources.map(() => 1),
        k,
        topK,
      );
    },

    async removeDocuments(ids) {
      const counts = await Promise.all(sources.map((s) => s.removeDocuments(ids)));
      return Math.max(...counts, 0);
    },

    async clear() {
      await Promise.all(sources.map((s) => s.clear()));
    },
  };
}

/**
 * Weighted hybrid adapter — applies per-source weights to RRF scores.
 *
 * SpecRefs: TPL-111
 *
 * @param {{ sources: RetrievalPort[], weights?: number[], k?: number }} options
 * @returns {RetrievalPort}
 */
export function createWeightedHybridAdapter(options) {
  const sources = options.sources ?? [];
  const weights = options.weights ?? sources.map(() => 1);
  const k = options.k ?? DEFAULT_K;

  return {
    async addDocuments(docs) {
      const allIds = await Promise.all(sources.map((s) => s.addDocuments(docs)));
      return allIds[0] ?? [];
    },

    async search(query, searchOpts) {
      if (sources.length === 0) return [];

      const topK = searchOpts?.topK ?? 5;
      const allResults = await Promise.all(
        sources.map((s) => s.search(query, { ...searchOpts, topK: topK * 2 })),
      );

      return fuseRRF(allResults, weights, k, topK);
    },

    async removeDocuments(ids) {
      const counts = await Promise.all(sources.map((s) => s.removeDocuments(ids)));
      return Math.max(...counts, 0);
    },

    async clear() {
      await Promise.all(sources.map((s) => s.clear()));
    },
  };
}

// ---------------------------------------------------------------------------
// RRF fusion helper
// ---------------------------------------------------------------------------

/**
 * @param {RetrievalResult[][]} allResults
 * @param {number[]} weights
 * @param {number} k
 * @param {number} topK
 * @returns {RetrievalResult[]}
 */
function fuseRRF(allResults, weights, k, topK) {
  /** @type {Map<string, { result: RetrievalResult, score: number }>} */
  const fused = new Map();

  for (let srcIdx = 0; srcIdx < allResults.length; srcIdx++) {
    const results = allResults[srcIdx];
    const weight = weights[srcIdx] ?? 1;

    for (let rank = 0; rank < results.length; rank++) {
      const r = results[rank];
      const rrfScore = weight / (k + rank + 1);
      const existing = fused.get(r.documentId);
      if (existing) {
        existing.score += rrfScore;
      } else {
        fused.set(r.documentId, { result: r, score: rrfScore });
      }
    }
  }

  // Sort by fused score descending
  const sorted = [...fused.values()].sort((a, b) => b.score - a.score);

  // Normalize scores to 0-1
  const maxScore = sorted[0]?.score ?? 1;

  return sorted.slice(0, topK).map(({ result, score }) => ({
    ...result,
    score: maxScore > 0 ? score / maxScore : 0,
  }));
}
