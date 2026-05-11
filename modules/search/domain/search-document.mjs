/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure search-document domain — validation + canonical shape.
 * @sidecar search-document.mjs.header.md
 * @layer domain | @hex _none_ | @ctx search
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure domain for indexable search documents. A document is an id, a bag
 * of string fields ("title", "body", …), and an optional bag of facets
 * (string or string[]) used for filtering. Domain validates structure and
 * returns a canonical frozen-ish shape; adapters own the inverted index.
 *
 * @typedef {{ id: string, fields: Record<string, string>, facets?: Record<string, string | string[]> }} SearchDocumentInput
 * @typedef {{ id: string, fields: Record<string, string>, facets: Record<string, string[]> }} SearchDocument
 * @typedef {{ id: string, score: number, document: SearchDocument, highlights: Record<string, string> }} SearchHit
 * @typedef {{ total: number, hits: SearchHit[], took: number }} SearchResult
 */

/**
 * Validate raw input and return a canonical {@link SearchDocument}. Throws
 * TypeError on any structural problem. Facet values are normalized to
 * string[] so adapters can filter uniformly.
 *
 * @param {SearchDocumentInput} input
 * @returns {SearchDocument}
 */
export function createSearchDocument(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('search.document.invalid'));
  }
  if (typeof input.id !== 'string' || input.id.length === 0) {
    throw new TypeError(t('search.document.missing_id'));
  }
  if (!input.fields || typeof input.fields !== 'object' || Array.isArray(input.fields)) {
    throw new TypeError(t('search.document.missing_fields'));
  }
  /** @type {Record<string, string>} */
  const fields = {};
  let fieldCount = 0;
  for (const [name, value] of Object.entries(input.fields)) {
    if (typeof value !== 'string') {
      throw new TypeError(t('search.document.invalid_field', { name }));
    }
    fields[name] = value;
    fieldCount += 1;
  }
  if (fieldCount === 0) {
    throw new TypeError(t('search.document.missing_fields'));
  }

  /** @type {Record<string, string[]>} */
  const facets = {};
  if (input.facets != null) {
    if (typeof input.facets !== 'object' || Array.isArray(input.facets)) {
      throw new TypeError(t('search.document.invalid_facet', { name: '*' }));
    }
    for (const [name, value] of Object.entries(input.facets)) {
      if (typeof value === 'string') {
        facets[name] = [value];
      } else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
        facets[name] = [...value];
      } else {
        throw new TypeError(t('search.document.invalid_facet', { name }));
      }
    }
  }

  return { id: input.id, fields, facets };
}

/**
 * Return the concatenated text across all fields of a document — useful
 * for highlighting and whole-document scoring.
 *
 * @param {SearchDocument} document
 * @returns {string}
 */
export function documentText(document) {
  return Object.values(document.fields).join(' ');
}
