/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Public Api.D implementation for the event-bus module.
 * @sidecar public-api.d.ts.header.md
 * @layer module | @hex application | @ctx event-bus
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the event-bus public API.
 *
 * SpecRefs: TPL-043; TPL-046
 */

export { EventBusPort, assertEventBusPort } from './ports/event-bus-port.js';
export { createMemoryEventBus } from './adapters/memory-event-bus.js';
