/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Store.D implementation for the state module.
 * @sidecar store.d.ts.header.md
 * @layer module | @hex domain | @ctx state
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the store domain.
 *
 * SpecRefs: TPL-048
 */

import { StatePort } from '../ports/state-port.js';

export function createStore<T>(initialState: T): StatePort<T>;
