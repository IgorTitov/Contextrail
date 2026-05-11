/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Embedder port contract for the retrieval module.
 * @sidecar embedder-port.mjs.header.md
 * @layer module | @hex port | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Port contract for embedder adapters.
 *
 * SpecRefs: TPL-108
 *
 * @typedef {import('../types.d.ts').EmbedderPort} EmbedderPort
 */

import { t } from '../messages.mjs';

/**
 * Validate that an adapter conforms to the EmbedderPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError}
 */
export function assertEmbedderPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('retrieval.error.embedder_port_not_object'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  if (typeof a.embed !== 'function') {
    throw new TypeError(t('retrieval.error.embedder_port_missing_embed'));
  }
}
