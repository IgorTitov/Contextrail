/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the state bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx state
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the state bounded module.
 * The only file other modules may import.
 *
 * SpecRefs: TPL-043
 */

// Ports
export { assertStatePort } from './ports/state-port.mjs';

// Adapters
export { createMemoryStateAdapter } from './adapters/memory-state-adapter.mjs';
export { createPersistentStateAdapter } from './adapters/persistent-state-adapter.mjs';
export { createSqliteStateAdapter } from './adapters/sqlite-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
