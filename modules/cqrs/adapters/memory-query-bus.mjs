/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory QueryBusPort adapter — Map-backed handler registry for read-side dispatch.
 * @sidecar memory-query-bus.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx cqrs
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';
import { createQuery } from '../domain/query.mjs';

/**
 * In-memory QueryBusPort adapter. Mirrors the command-bus shape on the
 * read side: validates every query through the pure domain `createQuery`,
 * stamps `id = qry_N` and `createdAt` via an injectable clock, and
 * awaits the handler registered for the query's type.
 *
 * Does not forward an event store to handlers — query handlers are
 * expected to read from a projection or read model, not from the write
 * log directly. Integrations that need replay-style reads should build a
 * projection and register it as the read model.
 *
 * @param {object} [options]
 * @param {() => number} [options.now]
 * @returns {import('../ports/query-bus-port.mjs').QueryBusPort}
 */
export function createMemoryQueryBus(options = {}) {
  const clock = options.now ?? Date.now;
  /** @type {Map<string, (query: import('../domain/query.mjs').Query, context: object) => Promise<unknown> | unknown>} */
  const handlers = new Map();
  let nextId = 1;

  return {
    register(queryType, handler) {
      if (typeof queryType !== 'string' || queryType.length === 0) {
        throw new TypeError(t('cqrs.query.invalid_type'));
      }
      if (typeof handler !== 'function') {
        throw new TypeError(t('cqrs.bus.missing_register'));
      }
      if (handlers.has(queryType)) {
        throw new TypeError(t('cqrs.bus.duplicate_handler', { type: queryType }));
      }
      handlers.set(queryType, handler);
    },

    async ask(query) {
      const validated = createQuery(query);
      const handler = handlers.get(validated.type);
      if (!handler) {
        throw new TypeError(t('cqrs.bus.no_handler', { type: validated.type }));
      }
      const stamped = {
        ...validated,
        id: `qry_${nextId++}`,
        createdAt: clock(),
      };
      return await handler(stamped, { now: clock });
    },

    clear() {
      handlers.clear();
      nextId = 1;
    },
  };
}
