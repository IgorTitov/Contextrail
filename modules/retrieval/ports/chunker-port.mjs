/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Define the ChunkerPort hexagonal port contract and provide assertChunkerPort, the runtime validator that enforces adapter compliance before use.
 * @sidecar chunker-port.mjs.header.md
 * @layer module | @hex port | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Port contract for chunker adapters.
 * Ports define what the domain needs, not how it is provided.
 *
 * SpecRefs: TPL-098
 *
 * @typedef {import('../types.d.ts').ChunkerPort} ChunkerPort
 */

import { t } from '../messages.mjs';

/**
 * Validate that an adapter conforms to the ChunkerPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertChunkerPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('retrieval.error.chunker_port_not_object'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  if (typeof a.chunk !== 'function') {
    throw new TypeError(t('retrieval.error.chunker_port_missing_chunk'));
  }
}
