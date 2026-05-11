/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single cross-module entry point for the cqrs module.
 * @sidecar public-api.mjs.header.md
 * @layer public-api | @hex _none_ | @ctx cqrs
 * @public true
 * @edit careful
 */

// Domain
export { createCommand } from './domain/command.mjs';
export { createQuery } from './domain/query.mjs';
export { createEvent } from './domain/event.mjs';
export { createAggregate, replayAggregate } from './domain/aggregate.mjs';

// Ports
export { assertCommandBusPort } from './ports/command-bus-port.mjs';
export { assertQueryBusPort } from './ports/query-bus-port.mjs';
export { assertEventStorePort } from './ports/event-store-port.mjs';

// Adapters
export { createMemoryCommandBus } from './adapters/memory-command-bus.mjs';
export { createMemoryQueryBus } from './adapters/memory-query-bus.mjs';
export { createMemoryEventStore } from './adapters/memory-event-store.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
