/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for command-bus adapters (register + dispatch + clear).
 * @sidecar command-bus-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx cqrs
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for command-bus adapters. A command bus is the single
 * dispatch point for writes — callers `dispatch` a validated Command, the
 * bus looks up the matching handler by command type, awaits it, and
 * returns the handler's result. Adapters own the stamping of `id` and
 * `createdAt` (the domain `createCommand` is pure validation only).
 *
 * Handlers receive `(command, context)` where the context is
 * implementation-defined: the memory adapter passes `{ now, eventStore? }`
 * so handlers can append events without threading the store through
 * every call site.
 *
 * @typedef {import('../domain/command.mjs').Command} Command
 *
 * @typedef {object} CommandBusPort
 * @property {(commandType: string, handler: (command: Command, context: object) => Promise<unknown> | unknown) => void} register
 * @property {(command: Command) => Promise<unknown>} dispatch
 * @property {() => void} clear
 */

const REQUIRED = [
  ['register', 'cqrs.bus.missing_register'],
  ['dispatch', 'cqrs.bus.missing_dispatch'],
  ['clear', 'cqrs.bus.missing_clear'],
];

/**
 * Validate that an adapter conforms to the CommandBusPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertCommandBusPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('cqrs.bus.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
