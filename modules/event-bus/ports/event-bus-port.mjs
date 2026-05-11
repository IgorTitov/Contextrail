/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Event Bus port contract for the event-bus module.
 * @sidecar event-bus-port.mjs.header.md
 * @layer module | @hex port | @ctx event-bus
 * @public false
 * @edit careful
 */

/**
 * Port contract for event bus adapters.
 * Ports define what the domain needs, not how it is provided.
 *
 * SpecRefs: TPL-044
 *
 * @typedef {Object} EventBusPort
 * @property {(event: string, handler: Function) => void} on
 * @property {(event: string, handler: Function) => void} off
 * @property {(event: string, ...args: any[]) => void} emit
 * @property {(event: string) => number} listenerCount
 * @property {() => void} clear
 */

import { t } from '../messages.mjs';

const REQUIRED_METHODS = ['on', 'off', 'emit', 'listenerCount', 'clear'];

/**
 * Validate that an adapter conforms to the EventBusPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertEventBusPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('event-bus.port.invalid_adapter'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('event-bus.port.missing_method', { method }));
    }
  }
}
