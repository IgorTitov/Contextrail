/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory inverted-index SearchPort adapter — TF-based scoring, filters, highlights.
 * @sidecar memory-search-adapter.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx search
 * @public false
 * @edit careful
 */

import { createSearchDocument, documentText } from '../domain/search-document.mjs';
import { tokenize } from '../domain/tokenize.mjs';
import { highlightMatches } from '../domain/highlight.mjs';
import { t } from '../messages.mjs';

/**
 * In-memory SearchPort adapter backed by an inverted index. Scoring is a
 * deliberately simple TF (term frequency) × IDF (inverse document
 * frequency) that captures "the rarer the term, the more it matters"
 * without the full BM25 machinery. This is the *user-facing* search
 * primitive (site search, autocomplete, type-ahead); for RAG-style chunk
 * retrieval use `modules/retrieval`.
 *
 * Features:
 *  - index / indexBatch / remove / clear
 *  - case-insensitive, Unicode-safe tokenization with stop words
 *  - facet filters (AND across facet names, OR across values)
 *  - highlight fragments per field
 *  - injectable clock for `took` timing — deterministic tests
 *
 * Not-features (on purpose):
 *  - no stemming / fuzzy matching (swap the adapter if you need it)
 *  - no persistence (this is the in-memory tier)
 *
 * @param {object} [options]
 * @param {() => number} [options.now]  Clock for `took` timing.
 * @returns {import('../ports/search-port.mjs').SearchPort}
 */
export function createMemorySearchAdapter(options = {}) {
  const clock = options.now ?? Date.now;

  /** @type {Map<string, import('../domain/search-document.mjs').SearchDocument>} */
  const documents = new Map();

  /** @type {Map<string, Map<string, number>>} token -> docId -> term frequency */
  const invertedIndex = new Map();

  /**
   * @param {string} id
   */
  function removeFromIndex(id) {
    for (const postings of invertedIndex.values()) {
      postings.delete(id);
    }
  }

  /**
   * @param {import('../domain/search-document.mjs').SearchDocument} document
   */
  function addToIndex(document) {
    const text = documentText(document);
    const tokens = tokenize(text);
    for (const token of tokens) {
      let postings = invertedIndex.get(token);
      if (!postings) {
        postings = new Map();
        invertedIndex.set(token, postings);
      }
      postings.set(document.id, (postings.get(document.id) ?? 0) + 1);
    }
  }

  /**
   * @param {import('../domain/search-document.mjs').SearchDocument} document
   * @param {Record<string, string | string[]> | undefined} filters
   * @returns {boolean}
   */
  function passesFilters(document, filters) {
    if (!filters) return true;
    for (const [name, raw] of Object.entries(filters)) {
      const allowed = Array.isArray(raw) ? raw : [raw];
      const facetValues = document.facets[name] ?? [];
      const ok = allowed.some((v) => facetValues.includes(v));
      if (!ok) return false;
    }
    return true;
  }

  return {
    async index(input) {
      const document = createSearchDocument(input);
      if (documents.has(document.id)) removeFromIndex(document.id);
      documents.set(document.id, document);
      addToIndex(document);
      return document;
    },

    async indexBatch(inputs) {
      if (!Array.isArray(inputs)) {
        throw new TypeError(t('search.document.invalid'));
      }
      /** @type {import('../domain/search-document.mjs').SearchDocument[]} */
      const out = [];
      for (const input of inputs) {
        out.push(await this.index(input));
      }
      return out;
    },

    async search(query, searchOptions = {}) {
      if (typeof query !== 'string' || query.length === 0) {
        throw new TypeError(t('search.query.invalid'));
      }
      const limit = searchOptions.limit ?? 10;
      const offset = searchOptions.offset ?? 0;
      const highlight = searchOptions.highlight !== false;
      if (!Number.isInteger(limit) || limit <= 0) {
        throw new TypeError(t('search.options.invalid_limit'));
      }
      if (!Number.isInteger(offset) || offset < 0) {
        throw new TypeError(t('search.options.invalid_offset'));
      }
      if (searchOptions.filters != null) {
        if (typeof searchOptions.filters !== 'object' || Array.isArray(searchOptions.filters)) {
          throw new TypeError(t('search.options.invalid_filter'));
        }
        for (const value of Object.values(searchOptions.filters)) {
          const list = Array.isArray(value) ? value : [value];
          if (!list.every((v) => typeof v === 'string')) {
            throw new TypeError(t('search.options.invalid_filter'));
          }
        }
      }

      const start = clock();
      const queryTokens = tokenize(query);
      /** @type {Map<string, number>} docId -> score */
      const scores = new Map();
      const totalDocs = documents.size;

      for (const token of queryTokens) {
        const postings = invertedIndex.get(token);
        if (!postings || postings.size === 0) continue;
        // IDF = log(1 + N / df)  — classic smoothing, never negative.
        const idf = Math.log(1 + totalDocs / postings.size);
        for (const [docId, tf] of postings) {
          scores.set(docId, (scores.get(docId) ?? 0) + tf * idf);
        }
      }

      /** @type {import('../domain/search-document.mjs').SearchHit[]} */
      const hitsAll = [];
      for (const [docId, score] of scores) {
        const document = documents.get(docId);
        if (!document) continue;
        if (!passesFilters(document, searchOptions.filters)) continue;
        /** @type {Record<string, string>} */
        const highlights = {};
        if (highlight) {
          for (const [fieldName, fieldValue] of Object.entries(document.fields)) {
            highlights[fieldName] = highlightMatches(fieldValue, queryTokens);
          }
        }
        hitsAll.push({ id: docId, score, document, highlights });
      }

      // Stable sort: score desc, id asc as tie-breaker.
      hitsAll.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

      const hits = hitsAll.slice(offset, offset + limit);
      const took = clock() - start;
      return { total: hitsAll.length, hits, took };
    },

    async remove(id) {
      if (!documents.has(id)) return false;
      documents.delete(id);
      removeFromIndex(id);
      return true;
    },

    clear() {
      documents.clear();
      invertedIndex.clear();
    },
  };
}
