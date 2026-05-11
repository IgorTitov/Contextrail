/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for search adapters (index + query + remove).
 * @sidecar search-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx search
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for full-text search adapters. Adapters own the index
 * (in-memory inverted index, SQLite FTS5, Meilisearch, Elasticsearch,
 * Typesense …) and must expose the minimal contract below. The domain
 * validates document shape and tokenization; the adapter owns the index,
 * scoring tie-breaks, filters, and highlights.
 *
 * @typedef {import('../domain/search-document.mjs').SearchDocumentInput} SearchDocumentInput
 * @typedef {import('../domain/search-document.mjs').SearchDocument} SearchDocument
 * @typedef {import('../domain/search-document.mjs').SearchResult} SearchResult
 *
 * @typedef {object} SearchOptions
 * @property {number} [limit]     Max hits to return (default 10).
 * @property {number} [offset]    Hits to skip (default 0).
 * @property {Record<string, string | string[]>} [filters]  Facet filters — AND across facet names, OR across values within one facet.
 * @property {boolean} [highlight]  Whether to include `<mark>`-wrapped highlight fragments (default true).
 *
 * @typedef {object} SearchPort
 * @property {(document: SearchDocumentInput) => Promise<SearchDocument>} index       Index or replace one document by id.
 * @property {(documents: SearchDocumentInput[]) => Promise<SearchDocument[]>} indexBatch  Index many documents at once.
 * @property {(query: string, options?: SearchOptions) => Promise<SearchResult>} search  Run a full-text query and return ranked hits.
 * @property {(id: string) => Promise<boolean>} remove                                 Remove a document by id; resolves to true if present.
 * @property {() => void} clear                                                        Drop the entire index — useful for tests.
 */

const REQUIRED = [
  ['index', 'search.port.missing_index'],
  ['indexBatch', 'search.port.missing_indexBatch'],
  ['search', 'search.port.missing_search'],
  ['remove', 'search.port.missing_remove'],
  ['clear', 'search.port.missing_clear'],
];

/**
 * Validate that an adapter conforms to the SearchPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertSearchPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('search.port.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
