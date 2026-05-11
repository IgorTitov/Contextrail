/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Persistent State adapter for the state module.
 * @sidecar persistent-state-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx state
 * @public false
 * @edit careful
 */

/**
 * Persistent state adapter. Wraps a StoragePort to load/save state
 * automatically on creation and on every state change.
 *
 * SpecRefs: TPL-050
 *
 * @template T
 * @param {T} defaultState - Fallback if storage is empty
 * @param {import('../../user-preferences/ports/storage-port.mjs').StoragePort} storagePort
 * @returns {import('../ports/state-port.mjs').StatePort}
 */

import { createStore } from '../domain/store.mjs';

export function createPersistentStateAdapter(defaultState, storagePort) {
  const loaded = storagePort.load();
  const initial = loaded != null ? /** @type {T} */ (loaded) : defaultState;
  const store = createStore(initial);

  // Wrap setState to persist after every change
  const originalSetState = store.setState;
  store.setState = function persistentSetState(updater) {
    originalSetState(updater);
    storagePort.save(store.getState());
  };

  return store;
}
