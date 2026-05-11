/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose State Port.D port for the state module.
 * @sidecar state-port.d.ts.header.md
 * @layer module | @hex port | @ctx state
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the StatePort contract.
 *
 * SpecRefs: TPL-048; TPL-051
 */

export interface StatePort<T = any> {
  getState(): T;
  setState(updater: T | ((prev: T) => T)): void;
  subscribe(listener: (state: T) => void): () => void;
  subscriberCount(): number;
}

export function assertStatePort(adapter: unknown): asserts adapter is StatePort;
