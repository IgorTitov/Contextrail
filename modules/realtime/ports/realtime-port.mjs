/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Realtime port contract for the realtime module.
 * @sidecar realtime-port.mjs.header.md
 * @layer module | @hex port | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * Port contract for realtime communication adapters.
 *
 * @typedef {object} RealtimePort
 * @property {(url: string, options?: object) => Promise<void>} connect
 * @property {() => Promise<void>} disconnect
 * @property {(channel: string, data: unknown) => void} send
 * @property {(channel: string, callback: Function) => void} subscribe
 * @property {(channel: string, callback?: Function) => void} unsubscribe
 * @property {(callback: Function) => void} onConnectionChange
 * @property {() => string} getState
 */

import { t } from '../messages.mjs';

/**
 * Validate that an adapter conforms to the RealtimePort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertRealtimePort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('realtime.port.invalid_adapter'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  if (typeof a.connect !== 'function') {
    throw new TypeError(t('realtime.port.missing_connect'));
  }
  if (typeof a.disconnect !== 'function') {
    throw new TypeError(t('realtime.port.missing_disconnect'));
  }
  if (typeof a.send !== 'function') {
    throw new TypeError(t('realtime.port.missing_send'));
  }
  if (typeof a.subscribe !== 'function') {
    throw new TypeError(t('realtime.port.missing_subscribe'));
  }
  if (typeof a.unsubscribe !== 'function') {
    throw new TypeError(t('realtime.port.missing_unsubscribe'));
  }
  if (typeof a.onConnectionChange !== 'function') {
    throw new TypeError(t('realtime.port.missing_on_connection_change'));
  }
  if (typeof a.getState !== 'function') {
    throw new TypeError(t('realtime.port.missing_get_state'));
  }
}
