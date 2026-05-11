/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide the BM25 keyword-based retrieval adapter implementing RetrievalPort using an inverted index and TF-IDF BM25 scoring with configurable k1 and b parameters.
 * @sidecar bm25-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * BM25 keyword-based retrieval adapter.
 * Implements RetrievalPort using BM25 scoring with an inverted index.
 *
 * SpecRefs: TPL-089
 *
 * @typedef {import('../types.d.ts').RetrievalDocument} RetrievalDocument
 * @typedef {import('../types.d.ts').RetrievalResult} RetrievalResult
 * @typedef {import('../types.d.ts').RetrievalSearchOptions} RetrievalSearchOptions
 * @typedef {import('../types.d.ts').RetrievalPort} RetrievalPort
 * @typedef {import('../types.d.ts').Bm25AdapterOptions} Bm25AdapterOptions
 */

// Common English stop words
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'it',
  'of',
  'in',
  'to',
  'and',
  'or',
  'for',
  'on',
  'at',
  'by',
  'with',
  'as',
  'be',
  'was',
  'were',
  'been',
  'are',
  'this',
  'that',
  'from',
  'not',
  'but',
  'had',
  'has',
  'have',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'its',
  'no',
  'nor',
  'so',
  'if',
  'then',
  'than',
  'too',
]);

/**
 * Tokenize text: lowercase, split on non-alphanumeric, filter stop words.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

let idCounter = 0;

/**
 * @param {Bm25AdapterOptions} [options]
 * @returns {RetrievalPort}
 */
export function createBm25Adapter(options = {}) {
  const k1 = options.k1 ?? 1.5;
  const b = options.b ?? 0.75;

  // Document store: id -> { content, metadata, tokens, length }
  /** @type {Map<string, { content: string, metadata: Record<string, unknown>, tokens: string[], length: number }>} */
  const docs = new Map();

  // Inverted index: term -> Set of doc IDs
  /** @type {Map<string, Set<string>>} */
  const index = new Map();

  // Term frequency per doc: docId -> (term -> count)
  /** @type {Map<string, Map<string, number>>} */
  const tfMap = new Map();

  let avgDl = 0;

  function recalcAvgDl() {
    if (docs.size === 0) {
      avgDl = 0;
      return;
    }
    let total = 0;
    for (const doc of docs.values()) total += doc.length;
    avgDl = total / docs.size;
  }

  return {
    /** @param {RetrievalDocument[]} documents */
    async addDocuments(documents) {
      const ids = [];
      for (const doc of documents) {
        const id = doc.id || `retrieval-${++idCounter}-${Date.now()}`;
        const tokens = tokenize(doc.content);
        const tf = new Map();
        for (const token of tokens) {
          tf.set(token, (tf.get(token) || 0) + 1);
        }

        docs.set(id, {
          content: doc.content,
          metadata: doc.metadata || {},
          tokens,
          length: tokens.length,
        });
        tfMap.set(id, tf);

        for (const term of tf.keys()) {
          if (!index.has(term)) index.set(term, new Set());
          index.get(term).add(id);
        }

        ids.push(id);
      }
      recalcAvgDl();
      return ids;
    },

    /**
     * @param {string} query
     * @param {RetrievalSearchOptions} [searchOptions]
     */
    async search(query, searchOptions = {}) {
      const topK = searchOptions.topK ?? 5;
      const minScore = searchOptions.minScore ?? 0;
      const filter = searchOptions.filter;
      const queryTokens = tokenize(query);

      if (queryTokens.length === 0 || docs.size === 0) return [];

      const N = docs.size;
      /** @type {Map<string, number>} */
      const scores = new Map();

      for (const term of queryTokens) {
        const postings = index.get(term);
        if (!postings) continue;
        const df = postings.size;
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

        for (const docId of postings) {
          const doc = docs.get(docId);
          const docTf = tfMap.get(docId);
          if (!doc || !docTf) continue;

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

          const freq = docTf.get(term) || 0;
          const tfScore =
            (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * (doc.length / (avgDl || 1))));
          const s = idf * tfScore;
          scores.set(docId, (scores.get(docId) || 0) + s);
        }
      }

      if (scores.size === 0) return [];

      // If filter was specified, we need to also filter docs that weren't in postings
      // (already handled above since we only iterate postings)

      // Normalize scores to 0-1
      let maxScore = 0;
      for (const s of scores.values()) {
        if (s > maxScore) maxScore = s;
      }

      /** @type {RetrievalResult[]} */
      const results = [];
      for (const [docId, rawScore] of scores) {
        const normalized = maxScore > 0 ? rawScore / maxScore : 0;
        if (normalized < minScore) continue;
        const doc = docs.get(docId);
        if (!doc) continue;
        results.push({
          documentId: docId,
          content: doc.content,
          score: normalized,
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
        const doc = docs.get(id);
        if (!doc) continue;
        // Remove from inverted index
        const tf = tfMap.get(id);
        if (tf) {
          for (const term of tf.keys()) {
            const postings = index.get(term);
            if (postings) {
              postings.delete(id);
              if (postings.size === 0) index.delete(term);
            }
          }
        }
        tfMap.delete(id);
        docs.delete(id);
        count++;
      }
      recalcAvgDl();
      return count;
    },

    async clear() {
      docs.clear();
      index.clear();
      tfMap.clear();
      avgDl = 0;
    },
  };
}
