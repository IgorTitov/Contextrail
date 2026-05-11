/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Memory State Adapter.D adapter for the state module.
 * @sidecar memory-state-adapter.d.ts.header.md
 * @layer module | @hex adapter | @ctx state
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the memory state adapter.
 *
 * SpecRefs: TPL-049
 */

import { StatePort } from '../ports/state-port.js';

export function createMemoryStateAdapter<T>(initialState: T): StatePort<T>;
