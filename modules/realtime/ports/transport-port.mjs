/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Transport port contract for the realtime module.
 * @sidecar transport-port.mjs.header.md
 * @layer module | @hex port | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * Port contract for individual transport adapters.
 *
 * @typedef {object} TransportPort
 * @property {(url: string, options?: object) => Promise<void>} open
 * @property {() => Promise<void>} close
 * @property {(data: unknown) => void} send
 * @property {(callback: Function) => void} onMessage
 * @property {(callback: Function) => void} onStateChange
 * @property {() => string} getState
 * @property {() => boolean} isSupported
 */

import { t } from '../messages.mjs';

/**
 * Validate that an adapter conforms to the TransportPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertTransportPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('realtime.transport.invalid_adapter'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  if (typeof a.open !== 'function') {
    throw new TypeError(t('realtime.transport.missing_open'));
  }
  if (typeof a.close !== 'function') {
    throw new TypeError(t('realtime.transport.missing_close'));
  }
  if (typeof a.send !== 'function') {
    throw new TypeError(t('realtime.transport.missing_send'));
  }
  if (typeof a.onMessage !== 'function') {
    throw new TypeError(t('realtime.transport.missing_on_message'));
  }
  if (typeof a.onStateChange !== 'function') {
    throw new TypeError(t('realtime.transport.missing_on_state_change'));
  }
  if (typeof a.getState !== 'function') {
    throw new TypeError(t('realtime.transport.missing_get_state'));
  }
  if (typeof a.isSupported !== 'function') {
    throw new TypeError(t('realtime.transport.missing_is_supported'));
  }
}
