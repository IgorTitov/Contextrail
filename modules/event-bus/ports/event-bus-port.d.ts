/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Event Bus Port.D port for the event-bus module.
 * @sidecar event-bus-port.d.ts.header.md
 * @layer module | @hex port | @ctx event-bus
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the EventBusPort contract.
 *
 * SpecRefs: TPL-044; TPL-046
 */

export interface EventBusPort {
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  listenerCount(event: string): number;
  clear(): void;
}

export function assertEventBusPort(adapter: unknown): asserts adapter is EventBusPort;
