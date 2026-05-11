/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory CommandBusPort adapter — Map-backed handler registry with id/createdAt stamping.
 * @sidecar memory-command-bus.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx cqrs
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';
import { createCommand } from '../domain/command.mjs';

/**
 * In-memory CommandBusPort adapter. Backs a deterministic bus for tests,
 * local development, and the api-starter demo. Validates every command
 * through the pure domain `createCommand`, stamps `id = cmd_N` and
 * `createdAt` via an injectable clock, and awaits the handler registered
 * for the command's type.
 *
 * If `eventStore` is supplied at construction time, every handler
 * receives it as part of its context so it can append events without
 * threading the store through call sites.
 *
 * @param {object} [options]
 * @param {() => number} [options.now]
 * @param {import('../ports/event-store-port.mjs').EventStorePort} [options.eventStore]
 * @returns {import('../ports/command-bus-port.mjs').CommandBusPort}
 */
export function createMemoryCommandBus(options = {}) {
  const clock = options.now ?? Date.now;
  const eventStore = options.eventStore;
  /** @type {Map<string, (command: import('../domain/command.mjs').Command, context: object) => Promise<unknown> | unknown>} */
  const handlers = new Map();
  let nextId = 1;

  return {
    register(commandType, handler) {
      if (typeof commandType !== 'string' || commandType.length === 0) {
        throw new TypeError(t('cqrs.command.invalid_type'));
      }
      if (typeof handler !== 'function') {
        throw new TypeError(t('cqrs.bus.missing_register'));
      }
      if (handlers.has(commandType)) {
        throw new TypeError(t('cqrs.bus.duplicate_handler', { type: commandType }));
      }
      handlers.set(commandType, handler);
    },

    async dispatch(command) {
      const validated = createCommand(command);
      const handler = handlers.get(validated.type);
      if (!handler) {
        throw new TypeError(t('cqrs.bus.no_handler', { type: validated.type }));
      }
      const stamped = {
        ...validated,
        id: `cmd_${nextId++}`,
        createdAt: clock(),
      };
      return await handler(stamped, { now: clock, eventStore });
    },

    clear() {
      handlers.clear();
      nextId = 1;
    },
  };
}
