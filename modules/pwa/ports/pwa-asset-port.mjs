/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for PWA asset-store adapters (manifest + service worker + listing).
 * @sidecar pwa-asset-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx pwa
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for PWA asset-store adapters. Adapters own where the
 * generated manifest JSON and service-worker source actually live —
 * in-memory for tests, filesystem for a build step, object storage
 * for a CDN upload — without leaking those concerns into the pure
 * domain generators.
 *
 * @typedef {import('../domain/web-manifest.mjs').WebManifest} WebManifest
 *
 * @typedef {object} PwaAssetRecord
 * @property {'manifest'|'service-worker'} kind
 * @property {string} path
 * @property {string} contentType
 * @property {number} size      Byte length of the serialized asset.
 * @property {number} writtenAt Epoch ms the asset was (re)written.
 *
 * @typedef {object} PwaAssetPort
 * @property {(manifest: WebManifest) => Promise<PwaAssetRecord>} writeManifest
 * @property {(source: string) => Promise<PwaAssetRecord>} writeServiceWorker
 * @property {() => PwaAssetRecord[]} listAssets
 * @property {() => void} clear
 */

const REQUIRED = [
  ['writeManifest', 'pwa.asset_store.missing_writeManifest'],
  ['writeServiceWorker', 'pwa.asset_store.missing_writeServiceWorker'],
  ['listAssets', 'pwa.asset_store.missing_listAssets'],
  ['clear', 'pwa.asset_store.missing_clear'],
];

/**
 * Validate that an adapter conforms to the PwaAssetPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertPwaAssetPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('pwa.asset_store.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
