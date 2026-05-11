/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose State port contract for the state module.
 * @sidecar state-port.mjs.header.md
 * @layer module | @hex port | @ctx state
 * @public false
 * @edit careful
 */

/**
 * Port contract for state store adapters.
 * Ports define what the domain needs, not how it is provided.
 *
 * SpecRefs: TPL-048
 *
 * @typedef {Object} StatePort
 * @property {() => any} getState
 * @property {(updater: any) => void} setState
 * @property {(listener: Function) => () => void} subscribe
 * @property {() => number} subscriberCount
 */

import { t } from '../messages.mjs';

const REQUIRED_METHODS = ['getState', 'setState', 'subscribe', 'subscriberCount'];

/**
 * Validate that an adapter conforms to the StatePort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertStatePort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('state.port.invalid_adapter'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('state.port.missing_method', { method }));
    }
  }
}
