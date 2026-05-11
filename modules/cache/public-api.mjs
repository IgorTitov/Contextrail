/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the cache bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx cache
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the cache bounded module.
 * The only file other modules may import.
 */

// Domain
export { isExpired, createLruTracker } from './domain/cache-utils.mjs';

// Ports
export { assertCachePort } from './ports/cache-port.mjs';

// Adapters
export { createMemoryLruAdapter } from './adapters/memory-lru-adapter.mjs';
export { createLocalStorageCacheAdapter } from './adapters/local-storage-adapter.mjs';
export { createIndexedDBCacheAdapter } from './adapters/indexeddb-adapter.mjs';
export { createRedisCacheAdapter } from './adapters/redis-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
