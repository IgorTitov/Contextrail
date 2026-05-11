/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the user-preferences bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx user-preferences
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the user-preferences bounded module.
 * The only file other modules may import.
 *
 * SpecRefs: TPL-029
 */

// Domain
export { defaultPreferences, mergePreferences, isValidPreferences } from './domain/preferences.mjs';

// Ports
export { assertStoragePort } from './ports/storage-port.mjs';

// Adapters
export { createMemoryAdapter } from './adapters/memory-adapter.mjs';
export { createLocalStorageAdapter } from './adapters/local-storage-adapter.mjs';
export { createIndexedDBAdapter } from './adapters/indexeddb-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
