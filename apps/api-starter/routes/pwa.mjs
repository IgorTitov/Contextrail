/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose PWA demo routes — serve the W3C manifest and generated service worker from the pwa module.
 * @sidecar pwa.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-001
/**
 * PWA demo routes — exercise the pwa module's public API from a host
 * server. The generator runs on first request, the in-memory asset
 * store caches the rendered manifest JSON and service worker source.
 * Real deployments swap the adapter for a filesystem, S3, or CDN
 * publisher behind the same `PwaAssetPort` without touching these
 * routes.
 *
 * GET /manifest.webmanifest  → the W3C Web App Manifest as JSON
 * GET /sw.js                 → the generated service worker source
 */

import {
  createWebManifest,
  generateServiceWorkerSource,
  cacheFirst,
  staleWhileRevalidate,
} from '../../../modules/pwa/public-api.mjs';
import { RAW_RESPONSE } from '../app.mjs';

const DEMO_MANIFEST = createWebManifest({
  name: 'Contextrail API Starter',
  shortName: 'Contextrail',
  startUrl: '/',
  display: 'standalone',
  themeColor: '#0f172a',
  backgroundColor: '#ffffff',
  icons: [
    { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
});

const DEMO_SW_SOURCE = generateServiceWorkerSource({
  cacheName: 'api-starter',
  version: 'v1',
  precache: ['/', '/health', '/manifest.webmanifest'],
  runtime: [
    {
      urlPattern: '\\.(?:png|jpg|svg|css|js)$',
      strategy: cacheFirst('static', { maxEntries: 50 }),
    },
    { urlPattern: '^.*/api/', strategy: staleWhileRevalidate('api') },
  ],
});

/**
 * @param {{ query: URLSearchParams }} _req
 * @param {object} ctx
 */
export async function pwaManifestHandler(_req, ctx) {
  if (!ctx.pwaAssets.getManifestJson()) {
    await ctx.pwaAssets.writeManifest(DEMO_MANIFEST);
  }
  const body = ctx.pwaAssets.getManifestJson();
  return {
    [RAW_RESPONSE]: true,
    contentType: 'application/manifest+json',
    body,
  };
}

/**
 * @param {{ query: URLSearchParams }} _req
 * @param {object} ctx
 */
export async function pwaServiceWorkerHandler(_req, ctx) {
  if (!ctx.pwaAssets.getServiceWorkerSource()) {
    await ctx.pwaAssets.writeServiceWorker(DEMO_SW_SOURCE);
  }
  const body = ctx.pwaAssets.getServiceWorkerSource();
  return {
    [RAW_RESPONSE]: true,
    contentType: 'application/javascript',
    body,
  };
}
