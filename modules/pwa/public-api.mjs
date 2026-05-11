/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single cross-module entry point for the pwa module.
 * @sidecar public-api.mjs.header.md
 * @layer public-api | @hex _none_ | @ctx pwa
 * @public true
 * @edit careful
 */

// Domain
export { createWebManifest, webManifestToJson } from './domain/web-manifest.mjs';
export {
  createCacheStrategy,
  cacheFirst,
  networkFirst,
  staleWhileRevalidate,
  networkOnly,
  cacheOnly,
} from './domain/cache-strategy.mjs';
export { generateServiceWorkerSource } from './domain/service-worker-source.mjs';

// Ports
export { assertPwaAssetPort } from './ports/pwa-asset-port.mjs';

// Adapters
export { createMemoryPwaAssetStore } from './adapters/memory-pwa-asset-store.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
