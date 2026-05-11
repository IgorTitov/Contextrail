/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the event-bus bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx event-bus
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the event-bus bounded module.
 * The only file other modules may import.
 *
 * SpecRefs: TPL-043
 */

// Ports
export { assertEventBusPort } from './ports/event-bus-port.mjs';

// Adapters
export { createMemoryEventBus } from './adapters/memory-event-bus.mjs';
export { createNodeEventBus } from './adapters/node-eventemitter-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
