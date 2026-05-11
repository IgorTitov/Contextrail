/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Store adapter hook for the react-starter React app.
 * @sidecar use-store.js.header.md
 * @layer app | @hex adapter | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * React adapter for the hex state module.
 *
 * Bridges the framework-free createStore() from modules/state
 * with React's useSyncExternalStore for tear-free concurrent reads.
 *
 * This is the thinnest possible adapter: 1 import from hex, 1 from React.
 */

import { useSyncExternalStore } from 'react';
import { createStore } from '@modules/state/public-api.mjs';

/**
 * Create a React-compatible store from the hex state module.
 *
 * @template T
 * @param {T} initialState
 * @returns {{ useStore: () => T, setState: (updater: T | ((prev: T) => T)) => void }}
 */
export function createReactStore(initialState) {
  const store = createStore(initialState);

  function useStore() {
    return useSyncExternalStore(store.subscribe, store.getState);
  }

  return { useStore, setState: store.setState };
}
