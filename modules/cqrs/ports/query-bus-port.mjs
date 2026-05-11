/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for query-bus adapters (register + ask + clear).
 * @sidecar query-bus-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx cqrs
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for query-bus adapters. A query bus is the single
 * dispatch point for reads — callers `ask` with a validated Query, the
 * bus looks up the matching handler by query type, awaits it, and
 * returns the handler's result. Query handlers are expected to be pure
 * reads against a projection or read model; they should not mutate
 * state. By convention the memory query bus does not forward the
 * event store to handlers.
 *
 * @typedef {import('../domain/query.mjs').Query} Query
 *
 * @typedef {object} QueryBusPort
 * @property {(queryType: string, handler: (query: Query, context: object) => Promise<unknown> | unknown) => void} register
 * @property {(query: Query) => Promise<unknown>} ask
 * @property {() => void} clear
 */

const REQUIRED = [
  ['register', 'cqrs.bus.missing_register'],
  ['ask', 'cqrs.bus.missing_ask'],
  ['clear', 'cqrs.bus.missing_clear'],
];

/**
 * Validate that an adapter conforms to the QueryBusPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertQueryBusPort(adapter) {
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
