/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Reranker port contract for the retrieval module.
 * @sidecar reranker-port.mjs.header.md
 * @layer module | @hex port | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Port contract for re-ranker adapters.
 *
 * SpecRefs: TPL-112
 */

import { t } from '../messages.mjs';

/**
 * Validate that an adapter conforms to the ReRankerPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError}
 */
export function assertReRankerPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('retrieval.error.reranker_port_not_object'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  if (typeof a.rerank !== 'function') {
    throw new TypeError(t('retrieval.error.reranker_port_missing_rerank'));
  }
}
