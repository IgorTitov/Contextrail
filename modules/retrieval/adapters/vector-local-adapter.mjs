/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide the vector-local retrieval adapter implementing RetrievalPort via cosine similarity search over pre-computed embeddings stored in-memory.
 * @sidecar vector-local-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Vector-local adapter for in-browser cosine similarity search.
 * Accepts pre-computed embeddings; does NOT embed text itself.
 *
 * SpecRefs: TPL-090
 *
 * @typedef {import('../types.d.ts').RetrievalDocument} RetrievalDocument
 * @typedef {import('../types.d.ts').RetrievalResult} RetrievalResult
 * @typedef {import('../types.d.ts').RetrievalSearchOptions} RetrievalSearchOptions
 * @typedef {import('../types.d.ts').RetrievalPort} RetrievalPort
 */

import { t } from '../messages.mjs';

/**
 * Compute cosine similarity between two vectors.
 * @param {Float32Array | number[]} a
 * @param {Float32Array | number[]} b
 * @returns {number} Similarity in [0, 1] (clamped for numerical stability)
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  // Clamp to [0, 1] — negative cosine treated as 0 for relevance
  return Math.max(0, Math.min(1, dot / denom));
}

let idCounter = 0;

/**
 * @param {Record<string, unknown>} [options]
 * @returns {RetrievalPort}
 */
export function createVectorLocalAdapter(_options = {}) {
  /** @type {Map<string, { content: string, metadata: Record<string, unknown>, embedding: Float32Array | number[] }>} */
  const store = new Map();
  /** @type {number | null} */
  let dimension = null;

  return {
    /** @param {RetrievalDocument[]} documents */
    async addDocuments(documents) {
      const ids = [];
      for (const doc of documents) {
        const embedding = doc.metadata?.embedding;
        const id = doc.id || `retrieval-vec-${++idCounter}-${Date.now()}`;

        if (!embedding || typeof embedding !== 'object') {
          throw new TypeError(t('retrieval.error.embedding_missing', { id }));
        }

        const dim = /** @type {Float32Array | number[]} */ (embedding).length;
        if (dimension === null) {
          dimension = dim;
        } else if (dim !== dimension) {
          throw new TypeError(
            t('retrieval.error.embedding_dimension', {
              expected: dimension,
              actual: dim,
            }),
          );
        }

        const meta = { ...(doc.metadata || {}) };
        // Store embedding separately, keep rest of metadata clean
        delete meta.embedding;

        store.set(id, {
          content: doc.content,
          metadata: meta,
          embedding: /** @type {Float32Array | number[]} */ (embedding),
        });
        ids.push(id);
      }
      return ids;
    },

    /**
     * @param {string} query
     * @param {RetrievalSearchOptions} [searchOptions]
     */
    async search(query, searchOptions = {}) {
      const queryEmbedding = searchOptions.queryEmbedding;
      if (!queryEmbedding) {
        throw new TypeError(t('retrieval.error.query_embedding_required'));
      }

      const qDim = /** @type {Float32Array | number[]} */ (queryEmbedding).length;
      if (dimension !== null && qDim !== dimension) {
        throw new TypeError(
          t('retrieval.error.query_embedding_dimension', {
            expected: dimension,
            actual: qDim,
          }),
        );
      }

      const topK = searchOptions.topK ?? 5;
      const minScore = searchOptions.minScore ?? 0;
      const filter = searchOptions.filter;

      /** @type {RetrievalResult[]} */
      const results = [];

      for (const [docId, doc] of store) {
        // Apply metadata filter
        if (filter) {
          let pass = true;
          for (const [fk, fv] of Object.entries(filter)) {
            if (doc.metadata[fk] !== fv) {
              pass = false;
              break;
            }
          }
          if (!pass) continue;
        }

        const score = cosineSimilarity(
          /** @type {Float32Array | number[]} */ (queryEmbedding),
          doc.embedding,
        );
        if (score < minScore) continue;

        results.push({
          documentId: docId,
          content: doc.content,
          score,
          metadata: { ...doc.metadata },
        });
      }

      results.sort((a, b2) => b2.score - a.score);
      return results.slice(0, topK);
    },

    /** @param {string[]} ids */
    async removeDocuments(ids) {
      let count = 0;
      for (const id of ids) {
        if (store.delete(id)) count++;
      }
      if (store.size === 0) dimension = null;
      return count;
    },

    async clear() {
      store.clear();
      dimension = null;
    },
  };
}
