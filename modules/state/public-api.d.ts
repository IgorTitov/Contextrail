/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Public Api.D implementation for the state module.
 * @sidecar public-api.d.ts.header.md
 * @layer module | @hex application | @ctx state
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the state public API.
 *
 * SpecRefs: TPL-043; TPL-051
 */

export { StatePort, assertStatePort } from './ports/state-port.js';
export { createMemoryStateAdapter } from './adapters/memory-state-adapter.js';
export { createPersistentStateAdapter } from './adapters/persistent-state-adapter.js';
