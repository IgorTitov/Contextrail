/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Memory Event Bus adapter for the event-bus module.
 * @sidecar memory-event-bus.mjs.header.md
 * @layer module | @hex adapter | @ctx event-bus
 * @public false
 * @edit careful
 */

/**
 * In-memory event bus adapter. Default for all environments.
 * Wraps the domain emitter directly — no persistence.
 *
 * SpecRefs: TPL-045
 *
 * @returns {import('../ports/event-bus-port.mjs').EventBusPort}
 */

import { createEventEmitter } from '../domain/event-emitter.mjs';

export function createMemoryEventBus() {
  return createEventEmitter();
}
