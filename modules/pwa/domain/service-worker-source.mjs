/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Generate a zero-dependency service worker source string from a precache list and runtime strategy rules.
 * @sidecar service-worker-source.mjs.header.md
 * @layer domain | @hex _none_ | @ctx pwa
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure generator for service-worker source code. Returns a JavaScript
 * string that can be served at `/sw.js` and registered by the client.
 * The emitted code uses only standard `ServiceWorkerGlobalScope` APIs —
 * no Workbox, no bundler. Precache URLs are installed on activation,
 * runtime rules are matched on fetch and dispatched to the named
 * strategy implementation inside the worker.
 *
 * @typedef {import('./cache-strategy.mjs').CacheStrategy} CacheStrategy
 *
 * @typedef {object} RuntimeRule
 * @property {string} urlPattern  RegExp source string matched against request URLs.
 * @property {CacheStrategy} strategy
 *
 * @typedef {object} ServiceWorkerSourceInput
 * @property {string} cacheName
 * @property {string} version
 * @property {string[]} [precache]
 * @property {RuntimeRule[]} [runtime]
 */

/**
 * Generate the service worker source as a string.
 *
 * @param {ServiceWorkerSourceInput} input
 * @returns {string}
 */
export function generateServiceWorkerSource(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('pwa.sw.invalid'));
  }
  const { cacheName, version, precache = [], runtime = [] } = input;
  if (typeof cacheName !== 'string' || cacheName.length === 0) {
    throw new TypeError(t('pwa.sw.invalid_cache_name'));
  }
  if (typeof version !== 'string' || version.length === 0) {
    throw new TypeError(t('pwa.sw.invalid_version'));
  }
  if (!Array.isArray(precache) || precache.some((u) => typeof u !== 'string' || u.length === 0)) {
    throw new TypeError(t('pwa.sw.invalid_precache'));
  }
  if (!Array.isArray(runtime)) {
    throw new TypeError(t('pwa.sw.invalid_runtime'));
  }
  for (const rule of runtime) {
    if (
      !rule ||
      typeof rule !== 'object' ||
      typeof rule.urlPattern !== 'string' ||
      rule.urlPattern.length === 0 ||
      !rule.strategy ||
      typeof rule.strategy !== 'object'
    ) {
      throw new TypeError(t('pwa.sw.invalid_runtime_entry'));
    }
  }

  const fullCacheName = `${cacheName}-${version}`;
  const precacheJson = JSON.stringify(precache);
  const runtimeJson = JSON.stringify(
    runtime.map((r) => ({ urlPattern: r.urlPattern, strategy: r.strategy })),
  );

  return `// Auto-generated service worker — do not edit by hand.
const CACHE_NAME = ${JSON.stringify(fullCacheName)};
const PRECACHE_URLS = ${precacheJson};
const RUNTIME_RULES = ${runtimeJson};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(cacheName);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then((response) => {
    caches.open(cacheName).then((cache) => cache.put(request, response.clone()));
    return response;
  });
  return cached || networkPromise;
}

async function cacheOnly(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return new Response('', { status: 504 });
}

async function networkOnly(request) {
  return fetch(request);
}

function dispatch(request, strategy) {
  const name = strategy.cacheName;
  switch (strategy.type) {
    case 'cacheFirst':
      return cacheFirst(request, name);
    case 'networkFirst':
      return networkFirst(request, name);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request, name);
    case 'cacheOnly':
      return cacheOnly(request);
    case 'networkOnly':
      return networkOnly(request);
    default:
      return fetch(request);
  }
}

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  for (const rule of RUNTIME_RULES) {
    if (new RegExp(rule.urlPattern).test(url)) {
      event.respondWith(dispatch(event.request, rule.strategy));
      return;
    }
  }
});
`;
}
