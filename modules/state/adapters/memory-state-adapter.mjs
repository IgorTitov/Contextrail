/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Memory State adapter for the state module.
 * @sidecar memory-state-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx state
 * @public false
 * @edit careful
 */

/**
 * In-memory state adapter. Default for all environments.
 * Wraps the domain store directly — no persistence.
 *
 * SpecRefs: TPL-049
 *
 * @template T
 * @param {T} initialState
 * @returns {import('../ports/state-port.mjs').StatePort}
 */

import { createStore } from '../domain/store.mjs';

export function createMemoryStateAdapter(initialState) {
  return createStore(initialState);
}
