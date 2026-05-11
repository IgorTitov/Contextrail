/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Memory Event Bus.D implementation for the event-bus module.
 * @sidecar memory-event-bus.d.ts.header.md
 * @layer module | @hex adapter | @ctx event-bus
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the memory event bus adapter.
 *
 * SpecRefs: TPL-045
 */

import { EventBusPort } from '../ports/event-bus-port.js';

export function createMemoryEventBus(): EventBusPort;
