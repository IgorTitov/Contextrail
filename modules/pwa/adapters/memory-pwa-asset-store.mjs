/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory PwaAssetPort adapter — Map-backed manifest + service worker store for tests and dev.
 * @sidecar memory-pwa-asset-store.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx pwa
 * @public false
 * @edit careful
 */

import { webManifestToJson } from '../domain/web-manifest.mjs';

/**
 * In-memory PwaAssetPort adapter. Backs a deterministic fake for tests,
 * local development, and the api-starter demo. Keeps the serialized
 * manifest JSON + service worker source in a `Map` keyed by path and
 * returns defensive copies so callers cannot mutate internal state.
 *
 * @param {object} [options]
 * @param {() => number} [options.now]   Clock function (defaults to Date.now).
 * @param {string} [options.manifestPath]     Defaults to 'manifest.webmanifest'.
 * @param {string} [options.serviceWorkerPath] Defaults to 'sw.js'.
 * @returns {import('../ports/pwa-asset-port.mjs').PwaAssetPort & {
 *   getManifestJson: () => string | null,
 *   getServiceWorkerSource: () => string | null,
 * }}
 */
export function createMemoryPwaAssetStore(options = {}) {
  const now = options.now ?? Date.now;
  const manifestPath = options.manifestPath ?? 'manifest.webmanifest';
  const swPath = options.serviceWorkerPath ?? 'sw.js';

  /** @type {Map<string, import('../ports/pwa-asset-port.mjs').PwaAssetRecord & { body: string }>} */
  const assets = new Map();

  /**
   * @param {import('../ports/pwa-asset-port.mjs').PwaAssetRecord & { body: string }} record
   * @returns {import('../ports/pwa-asset-port.mjs').PwaAssetRecord}
   */
  function clone(record) {
    return {
      kind: record.kind,
      path: record.path,
      contentType: record.contentType,
      size: record.size,
      writtenAt: record.writtenAt,
    };
  }

  return {
    async writeManifest(manifest) {
      const body = JSON.stringify(webManifestToJson(manifest));
      const record = {
        kind: /** @type {const} */ ('manifest'),
        path: manifestPath,
        contentType: 'application/manifest+json',
        size: Buffer.byteLength(body),
        writtenAt: now(),
        body,
      };
      assets.set(manifestPath, record);
      return clone(record);
    },

    async writeServiceWorker(source) {
      if (typeof source !== 'string' || source.length === 0) {
        throw new TypeError('writeServiceWorker: source must be a non-empty string.');
      }
      const record = {
        kind: /** @type {const} */ ('service-worker'),
        path: swPath,
        contentType: 'application/javascript',
        size: Buffer.byteLength(source),
        writtenAt: now(),
        body: source,
      };
      assets.set(swPath, record);
      return clone(record);
    },

    listAssets() {
      return [...assets.values()].map(clone);
    },

    clear() {
      assets.clear();
    },

    getManifestJson() {
      return assets.get(manifestPath)?.body ?? null;
    },

    getServiceWorkerSource() {
      return assets.get(swPath)?.body ?? null;
    },
  };
}
