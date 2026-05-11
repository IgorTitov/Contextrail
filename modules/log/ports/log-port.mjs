/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Log port contract for the log module.
 * @sidecar log-port.mjs.header.md
 * @layer module | @hex port | @ctx log
 * @public false
 * @edit careful
 */

/**
 * Port contract for log adapters.
 *
 * @typedef {'debug' | 'info' | 'warn' | 'error'} LogLevel
 *
 * @typedef {object} LogEntry
 * @property {LogLevel} level
 * @property {string} message
 * @property {*} [data]
 * @property {string} [scope]
 * @property {number} timestamp
 *
 * @typedef {object} LogPortOptions
 * @property {LogLevel} [minLevel]
 *
 * @typedef {object} LogPort
 * @property {(msg: string, data?: *) => void} debug
 * @property {(msg: string, data?: *) => void} info
 * @property {(msg: string, data?: *) => void} warn
 * @property {(msg: string, data?: *) => void} error
 * @property {(scope: string) => LogPort} child
 */

import { t } from '../messages.mjs';

const REQUIRED_METHODS = ['debug', 'info', 'warn', 'error', 'child'];

/**
 * Validate that an adapter conforms to the LogPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertLogPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('log.port.invalid_adapter'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('log.port.missing_method', { method }));
    }
  }
}
