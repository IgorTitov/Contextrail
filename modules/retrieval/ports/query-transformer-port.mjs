/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Query Transformer port contract for the retrieval module.
 * @sidecar query-transformer-port.mjs.header.md
 * @layer module | @hex port | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Port contract for query transformer adapters.
 * Ports define what the domain needs, not how it is provided.
 *
 * SpecRefs: TPL-125
 *
 * @typedef {import('../types.d.ts').QueryTransformerPort} QueryTransformerPort
 */

import { t } from '../messages.mjs';

/**
 * Validate that an adapter conforms to the QueryTransformerPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertQueryTransformerPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('retrieval.error.transformer_port_not_object'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  if (typeof a.transform !== 'function') {
    throw new TypeError(t('retrieval.error.transformer_port_missing_transform'));
  }
}
