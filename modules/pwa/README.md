<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the pwa hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx pwa
@public false
@edit careful -->

# pwa

Hexagonal PWA module — pure W3C Web App Manifest value object, pure cache-strategy descriptors, a pure zero-dependency service-worker source generator, a `PwaAssetPort` for publishing the generated assets, and an in-memory adapter for tests and dev. Zero external dependencies and zero Node builtins.

## Why

Progressive Web App support is a TOP-100 starter staple that most templates either hard-wire into a build plugin (Workbox, Vite-PWA, Next-PWA) or skip entirely. When the bundler, CDN, or offline strategy changes, every caller has to change with it. This module keeps manifest + cache + service-worker generation as a pure domain (returns strings and plain objects, never touches `navigator`, `caches`, or the filesystem), wraps publishing behind a 4-method `PwaAssetPort`, and ships a zero-dependency in-memory adapter. Real deployments plug a filesystem-, S3-, or CDN-upload adapter behind the same port without touching the generators.

The emitted service worker uses only standard `ServiceWorkerGlobalScope` APIs (`caches`, `fetch`, `Response`, `self.clients`) — no Workbox runtime, no bundler pre-processing. Other modules (notifications, auth, analytics, …) can opt in to offline-shell caching by contributing runtime rules through this module's API.

## Structure

```text
modules/pwa/
├── domain/
│   ├── web-manifest.mjs           # createWebManifest + webManifestToJson (W3C JSON shape)
│   ├── cache-strategy.mjs         # createCacheStrategy + cacheFirst/networkFirst/… factories
│   └── service-worker-source.mjs  # generateServiceWorkerSource → JavaScript source string
├── ports/
│   └── pwa-asset-port.mjs         # PwaAssetPort + assertPwaAssetPort
├── adapters/
│   └── memory-pwa-asset-store.mjs # In-memory Map-backed store (tests + api-starter demo)
├── public-api.mjs                 # Cross-module entry point
├── messages.mjs                   # i18n keys (pwa.*)
├── manifest.json                  # Module metadata + capability surface
└── README.md
```

## Hexagonal layers

| Layer        | Folder           | Rule                                                                |
| ------------ | ---------------- | ------------------------------------------------------------------- |
| **Domain**   | `domain/`        | Pure functions, no I/O, no browser globals, no `node:*` imports.    |
| **Ports**    | `ports/`         | `PwaAssetPort` contract (4 methods)                                 |
| **Adapters** | `adapters/`      | In-memory store (defensive copies, injectable clock).               |
| **Public**   | `public-api.mjs` | The only file other modules may import.                             |

## Usage

### Generate and publish a manifest

```javascript
import {
  createWebManifest,
  createMemoryPwaAssetStore,
  assertPwaAssetPort,
} from './modules/pwa/public-api.mjs';

const manifest = createWebManifest({
  name: 'Contextrail Starter',
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

const store = createMemoryPwaAssetStore();
assertPwaAssetPort(store);
const record = await store.writeManifest(manifest);
// → { kind: 'manifest', path: 'manifest.webmanifest', contentType: 'application/manifest+json', size, writtenAt }
```

### Generate a service worker

```javascript
import {
  generateServiceWorkerSource,
  cacheFirst,
  staleWhileRevalidate,
} from './modules/pwa/public-api.mjs';

const source = generateServiceWorkerSource({
  cacheName: 'contextrail',
  version: 'v1',
  precache: ['/', '/index.html', '/app.css', '/app.js'],
  runtime: [
    { urlPattern: '\\.(?:png|jpg|svg)$', strategy: cacheFirst('images', { maxEntries: 50 }) },
    { urlPattern: '^https://api\\.', strategy: staleWhileRevalidate('api') },
  ],
});
// → a self-contained service worker source string safe to serve at /sw.js
```

## Rules

- Domain is pure. No `navigator`, no `caches`, no `fetch`, no `node:*` imports.
- Adapters validate every input through the pure domain before persisting.
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.
- All user-facing copy uses i18n keys via `messages.mjs`.

## Tests

- `tests/unit/pwa.test.mjs` — proves manifest validation + JSON shape, cache-strategy descriptors, service-worker source generation, port assertion, memory adapter lifecycle.
- `tests/contract/pwa-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
