/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Tokenizer port contract for the retrieval module.
 * @sidecar tokenizer-port.mjs.header.md
 * @layer module | @hex port | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Port contract for tokenizer adapters.
 *
 * SpecRefs: TPL-104
 *
 * @typedef {import('../types.d.ts').TokenizerPort} TokenizerPort
 */

import { t } from '../messages.mjs';

/**
 * Validate that an adapter conforms to the TokenizerPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError}
 */
export function assertTokenizerPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('retrieval.error.tokenizer_port_not_object'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  if (typeof a.countTokens !== 'function') {
    throw new TypeError(
      t('retrieval.error.tokenizer_port_missing_method', { method: 'countTokens' }),
    );
  }
  if (typeof a.truncateToTokens !== 'function') {
    throw new TypeError(
      t('retrieval.error.tokenizer_port_missing_method', { method: 'truncateToTokens' }),
    );
  }
}
