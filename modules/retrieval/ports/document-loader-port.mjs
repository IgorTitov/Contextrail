/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Document Loader port contract for the retrieval module.
 * @sidecar document-loader-port.mjs.header.md
 * @layer module | @hex port | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Port contract for document loader adapters.
 * Ports define what the domain needs, not how it is provided.
 *
 * SpecRefs: TPL-122
 *
 * @typedef {import('../types.d.ts').DocumentLoaderPort} DocumentLoaderPort
 */

import { t } from '../messages.mjs';

/**
 * Validate that an adapter conforms to the DocumentLoaderPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertDocumentLoaderPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('retrieval.error.loader_port_not_object'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  if (typeof a.load !== 'function') {
    throw new TypeError(t('retrieval.error.loader_port_missing_load'));
  }
}
