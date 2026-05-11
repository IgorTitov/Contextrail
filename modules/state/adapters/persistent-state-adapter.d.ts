/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Persistent State Adapter.D adapter for the state module.
 * @sidecar persistent-state-adapter.d.ts.header.md
 * @layer module | @hex adapter | @ctx state
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the persistent state adapter.
 *
 * SpecRefs: TPL-050
 */

import { StatePort } from '../ports/state-port.js';

interface StoragePort {
  load(): any;
  save(state: any): void;
}

export function createPersistentStateAdapter<T>(defaultState: T, storagePort: StoragePort): StatePort<T>;
