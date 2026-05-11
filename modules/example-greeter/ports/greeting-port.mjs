/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Define the port contract that adapters must satisfy for the greeter domain.
 * @sidecar greeting-port.mjs.header.md
 * @layer module | @hex port | @ctx example-greeter
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract — any greeting adapter must satisfy this shape.
 *
 * @typedef {object} GreetingPort
 * @property {() => string} getTemplate  Returns a greeting template with `{name}` placeholder.
 */

/**
 * Validate that an adapter conforms to the GreetingPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertGreetingPort(adapter) {
  if (!adapter || typeof adapter.getTemplate !== 'function') {
    throw new TypeError(t('example-greeter.port.missing_getTemplate'));
  }
}
