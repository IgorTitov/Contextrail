/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Event Emitter.D implementation for the event-bus module.
 * @sidecar event-emitter.d.ts.header.md
 * @layer module | @hex domain | @ctx event-bus
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the event emitter domain.
 *
 * SpecRefs: TPL-044
 */

import { EventBusPort } from '../ports/event-bus-port.js';

export function createEventEmitter(): EventBusPort;
