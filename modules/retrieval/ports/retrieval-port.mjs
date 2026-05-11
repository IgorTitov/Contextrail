/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Define the RetrievalPort contract and the assertRetrievalPort runtime validator that confirms adapters implement addDocuments, search, removeDocuments, and clear.
 * @sidecar retrieval-port.mjs.header.md
 * @layer module | @hex port | @ctx retrieval
 * @public true
 * @edit careful
 */

/**
 * Port contract for retrieval adapters.
 * Ports define what the domain needs, not how it is provided.
 *
 * SpecRefs: TPL-087
 *
 * @typedef {import('../types.d.ts').RetrievalDocument} RetrievalDocument
 * @typedef {import('../types.d.ts').RetrievalResult} RetrievalResult
 * @typedef {import('../types.d.ts').RetrievalSearchOptions} RetrievalSearchOptions
 * @typedef {import('../types.d.ts').RetrievalChunk} RetrievalChunk
 * @typedef {import('../types.d.ts').RetrievalPort} RetrievalPort
 */

import { t } from '../messages.mjs';

const REQUIRED_METHODS = ['addDocuments', 'search', 'removeDocuments', 'clear'];

/**
 * Validate that an adapter conforms to the RetrievalPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertRetrievalPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('retrieval.error.port_not_object'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('retrieval.error.port_missing_method', { method }));
    }
  }
}
