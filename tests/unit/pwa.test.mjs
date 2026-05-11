/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the pwa bounded module — manifest, cache strategies, service worker source, port, memory adapter.
 * @sidecar pwa.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWebManifest,
  webManifestToJson,
  createCacheStrategy,
  cacheFirst,
  networkFirst,
  staleWhileRevalidate,
  networkOnly,
  cacheOnly,
  generateServiceWorkerSource,
  assertPwaAssetPort,
  createMemoryPwaAssetStore,
} from '../../modules/pwa/public-api.mjs';

// ---------------------------------------------------------------------------
// Web manifest
// ---------------------------------------------------------------------------

describe('pwa domain — createWebManifest', () => {
  test('accepts a minimal valid manifest', () => {
    const manifest = createWebManifest({
      name: 'Contextrail',
      shortName: 'CT',
      startUrl: '/',
      display: 'standalone',
    });
    assert.equal(manifest.name, 'Contextrail');
    assert.equal(manifest.shortName, 'CT');
    assert.equal(manifest.startUrl, '/');
    assert.equal(manifest.display, 'standalone');
    assert.deepEqual(manifest.icons, []);
  });

  test('accepts colors and icons', () => {
    const manifest = createWebManifest({
      name: 'App',
      shortName: 'App',
      startUrl: '/',
      display: 'standalone',
      themeColor: '#0f172a',
      backgroundColor: '#ffffff',
      icons: [
        { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    });
    assert.equal(manifest.themeColor, '#0f172a');
    assert.equal(manifest.backgroundColor, '#ffffff');
    assert.equal(manifest.icons.length, 2);
    assert.equal(manifest.icons[1].purpose, 'maskable');
  });

  test('rejects null and non-object input', () => {
    assert.throws(() => createWebManifest(null), TypeError);
    assert.throws(() => createWebManifest('x'), TypeError);
  });

  test('rejects missing/empty name', () => {
    assert.throws(
      () => createWebManifest({ name: '', shortName: 'A', startUrl: '/', display: 'standalone' }),
      TypeError,
    );
  });

  test('rejects invalid display mode', () => {
    assert.throws(
      () =>
        createWebManifest({
          name: 'A',
          shortName: 'A',
          startUrl: '/',
          // @ts-expect-error invalid
          display: 'kiosk',
        }),
      TypeError,
    );
  });

  test('rejects non-array icons', () => {
    assert.throws(
      () =>
        createWebManifest({
          name: 'A',
          shortName: 'A',
          startUrl: '/',
          display: 'standalone',
          // @ts-expect-error invalid
          icons: { src: '/x', sizes: '1x1' },
        }),
      TypeError,
    );
  });

  test('rejects icon entries missing src or sizes', () => {
    assert.throws(
      () =>
        createWebManifest({
          name: 'A',
          shortName: 'A',
          startUrl: '/',
          display: 'standalone',
          icons: [{ src: '', sizes: '1x1' }],
        }),
      TypeError,
    );
    assert.throws(
      () =>
        createWebManifest({
          name: 'A',
          shortName: 'A',
          startUrl: '/',
          display: 'standalone',
          // @ts-expect-error missing sizes
          icons: [{ src: '/x' }],
        }),
      TypeError,
    );
  });

  test('returns a frozen descriptor', () => {
    const manifest = createWebManifest({
      name: 'A',
      shortName: 'A',
      startUrl: '/',
      display: 'standalone',
    });
    assert.ok(Object.isFrozen(manifest));
  });
});

describe('pwa domain — webManifestToJson', () => {
  test('converts to W3C snake_case shape', () => {
    const manifest = createWebManifest({
      name: 'App',
      shortName: 'App',
      startUrl: '/',
      display: 'standalone',
      themeColor: '#000',
      backgroundColor: '#fff',
      icons: [{ src: '/x.png', sizes: '192x192', type: 'image/png' }],
    });
    const json = webManifestToJson(manifest);
    assert.equal(json.short_name, 'App');
    assert.equal(json.start_url, '/');
    assert.equal(json.theme_color, '#000');
    assert.equal(json.background_color, '#fff');
    assert.deepEqual(json.icons, [{ src: '/x.png', sizes: '192x192', type: 'image/png' }]);
  });
});

// ---------------------------------------------------------------------------
// Cache strategies
// ---------------------------------------------------------------------------

describe('pwa domain — cache strategies', () => {
  test('createCacheStrategy validates type and cacheName', () => {
    const s = createCacheStrategy({ type: 'cacheFirst', cacheName: 'static' });
    assert.equal(s.type, 'cacheFirst');
    assert.equal(s.cacheName, 'static');
    assert.ok(Object.isFrozen(s));
  });

  test('rejects unknown strategy type', () => {
    assert.throws(
      // @ts-expect-error invalid
      () => createCacheStrategy({ type: 'cacheNever', cacheName: 'x' }),
      TypeError,
    );
  });

  test('rejects empty cache name', () => {
    assert.throws(() => createCacheStrategy({ type: 'cacheFirst', cacheName: '' }), TypeError);
  });

  test('rejects non-positive maxEntries and maxAgeSeconds', () => {
    assert.throws(
      () => createCacheStrategy({ type: 'cacheFirst', cacheName: 'x', maxEntries: 0 }),
      TypeError,
    );
    assert.throws(
      () => createCacheStrategy({ type: 'cacheFirst', cacheName: 'x', maxAgeSeconds: -1 }),
      TypeError,
    );
  });

  test('factories all return frozen descriptors of the right type', () => {
    assert.equal(cacheFirst('a').type, 'cacheFirst');
    assert.equal(networkFirst('b').type, 'networkFirst');
    assert.equal(staleWhileRevalidate('c').type, 'staleWhileRevalidate');
    assert.equal(networkOnly('d').type, 'networkOnly');
    assert.equal(cacheOnly('e').type, 'cacheOnly');
  });
});

// ---------------------------------------------------------------------------
// Service worker source
// ---------------------------------------------------------------------------

describe('pwa domain — generateServiceWorkerSource', () => {
  test('returns a string with install, activate, fetch handlers', () => {
    const source = generateServiceWorkerSource({
      cacheName: 'app',
      version: 'v1',
      precache: ['/', '/index.html'],
      runtime: [{ urlPattern: '\\.png$', strategy: cacheFirst('images') }],
    });
    assert.equal(typeof source, 'string');
    assert.ok(source.includes("addEventListener('install'"));
    assert.ok(source.includes("addEventListener('activate'"));
    assert.ok(source.includes("addEventListener('fetch'"));
    assert.ok(source.includes('app-v1'));
    assert.ok(source.includes('/index.html'));
    assert.ok(source.includes('cacheFirst'));
  });

  test('rejects missing version', () => {
    assert.throws(
      // @ts-expect-error invalid
      () => generateServiceWorkerSource({ cacheName: 'a', precache: [] }),
      TypeError,
    );
  });

  test('rejects non-array precache', () => {
    assert.throws(
      () =>
        generateServiceWorkerSource({
          cacheName: 'a',
          version: 'v1',
          // @ts-expect-error invalid
          precache: '/',
        }),
      TypeError,
    );
  });

  test('rejects runtime entry without strategy', () => {
    assert.throws(
      () =>
        generateServiceWorkerSource({
          cacheName: 'a',
          version: 'v1',
          runtime: [
            // @ts-expect-error invalid
            { urlPattern: '\\.png$' },
          ],
        }),
      TypeError,
    );
  });

  test('handles empty precache and runtime', () => {
    const source = generateServiceWorkerSource({
      cacheName: 'empty',
      version: 'v1',
    });
    assert.ok(source.includes('PRECACHE_URLS = []'));
    assert.ok(source.includes('RUNTIME_RULES = []'));
  });
});

// ---------------------------------------------------------------------------
// Port assertion
// ---------------------------------------------------------------------------

describe('pwa ports — assertPwaAssetPort', () => {
  test('accepts a complete adapter', () => {
    const fake = {
      writeManifest() {},
      writeServiceWorker() {},
      listAssets() {},
      clear() {},
    };
    assert.doesNotThrow(() => assertPwaAssetPort(fake));
  });

  test('rejects null and non-object', () => {
    assert.throws(() => assertPwaAssetPort(null), TypeError);
    assert.throws(() => assertPwaAssetPort('no'), TypeError);
  });

  test('rejects adapter missing each method', () => {
    const base = {
      writeManifest() {},
      writeServiceWorker() {},
      listAssets() {},
      clear() {},
    };
    for (const method of ['writeManifest', 'writeServiceWorker', 'listAssets', 'clear']) {
      const broken = { ...base };
      delete (/** @type {any} */ (broken)[method]);
      assert.throws(() => assertPwaAssetPort(broken), TypeError);
    }
  });
});

// ---------------------------------------------------------------------------
// Memory adapter
// ---------------------------------------------------------------------------

describe('pwa adapters — createMemoryPwaAssetStore', () => {
  test('satisfies the port contract', () => {
    const store = createMemoryPwaAssetStore();
    assert.doesNotThrow(() => assertPwaAssetPort(store));
  });

  test('writes a manifest and returns an asset record', async () => {
    const now = 1000;
    const store = createMemoryPwaAssetStore({ now: () => now });
    const manifest = createWebManifest({
      name: 'A',
      shortName: 'A',
      startUrl: '/',
      display: 'standalone',
    });
    const rec = await store.writeManifest(manifest);
    assert.equal(rec.kind, 'manifest');
    assert.equal(rec.path, 'manifest.webmanifest');
    assert.equal(rec.contentType, 'application/manifest+json');
    assert.equal(rec.writtenAt, 1000);
    assert.ok(rec.size > 0);
    const json = store.getManifestJson();
    assert.ok(json && json.includes('"start_url":"/"'));
  });

  test('writes a service worker and returns an asset record', async () => {
    const store = createMemoryPwaAssetStore();
    const source = generateServiceWorkerSource({ cacheName: 'app', version: 'v1' });
    const rec = await store.writeServiceWorker(source);
    assert.equal(rec.kind, 'service-worker');
    assert.equal(rec.path, 'sw.js');
    assert.equal(rec.contentType, 'application/javascript');
    assert.equal(store.getServiceWorkerSource(), source);
  });

  test('rejects empty service worker source', async () => {
    const store = createMemoryPwaAssetStore();
    await assert.rejects(() => store.writeServiceWorker(''), TypeError);
  });

  test('listAssets returns snapshot and clear empties the store', async () => {
    const store = createMemoryPwaAssetStore();
    const manifest = createWebManifest({
      name: 'A',
      shortName: 'A',
      startUrl: '/',
      display: 'standalone',
    });
    await store.writeManifest(manifest);
    await store.writeServiceWorker('/* sw */ self.addEventListener;');
    assert.equal(store.listAssets().length, 2);
    store.clear();
    assert.equal(store.listAssets().length, 0);
    assert.equal(store.getManifestJson(), null);
    assert.equal(store.getServiceWorkerSource(), null);
  });

  test('returned records cannot be mutated back into the store', async () => {
    const store = createMemoryPwaAssetStore();
    const manifest = createWebManifest({
      name: 'A',
      shortName: 'A',
      startUrl: '/',
      display: 'standalone',
    });
    const rec = await store.writeManifest(manifest);
    rec.path = 'tampered';
    const [fromList] = store.listAssets();
    assert.equal(fromList.path, 'manifest.webmanifest');
  });
});
