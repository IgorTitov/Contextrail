/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide service worker with cache-first and network-first caching strategies for PWA mode.
 * @sidecar sw.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

/**
 * Service Worker for PWA mode.
 *
 * Caching strategies:
 *  - Install: precache app shell assets listed in APP_SHELL_URLS.
 *  - Fetch (app shell): cache-first — serve from cache, fall back to network.
 *  - Fetch (other same-origin): network-first — try network, fall back to cache.
 *  - Fetch (cross-origin): ignored (no caching).
 *  - Offline fallback: serve cached root for navigation requests.
 *
 * Version bump: change CACHE_NAME to invalidate all caches on next activate.
 *
 * Exports (for unit testing in Node.js):
 *  - CACHE_NAME, APP_SHELL_URLS, isAppShellUrl
 *  - Event listeners only attach in ServiceWorkerGlobalScope.
 */

/** Cache name with version — bump to invalidate. */
export const CACHE_NAME = 'starter-v1';

/** URLs to precache on install (relative to the SW script location). */
export const APP_SHELL_URLS = [
  './',
  './index.html',
  './app.mjs',
  './app-config.mjs',
  './messages.mjs',
  './manifest.json',
  './theme-toggle/theme-variables.css',
  './layout/layout.css',
  './navigation/navigation.css',
  './notifications/notifications.css',
  './loading-states/loading-states.css',
  './error-boundary/error-boundary.css',
];

/**
 * Check whether a URL matches a precached app shell asset.
 *
 * @param {URL} url — the request URL
 * @param {string} baseUrl — the service worker script URL (used to resolve relative paths)
 * @returns {boolean}
 */
export function isAppShellUrl(url, baseUrl) {
  const base = new URL(baseUrl);
  if (url.origin !== base.origin) return false;
  for (const shellUrl of APP_SHELL_URLS) {
    const resolved = new URL(shellUrl, baseUrl);
    if (url.pathname === resolved.pathname) return true;
  }
  return false;
}

// --- Service Worker event handlers (only in SW context) ---

if (typeof ServiceWorkerGlobalScope !== 'undefined') {
  const sw = /** @type {ServiceWorkerGlobalScope} */ (self);

  // Install — precache app shell and skip waiting
  sw.addEventListener('install', (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.addAll(APP_SHELL_URLS))
        .then(() => sw.skipWaiting()),
    );
  });

  // Activate — purge old caches and claim clients
  sw.addEventListener('activate', (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
        )
        .then(() => sw.clients.claim()),
    );
  });

  // Fetch — cache-first for shell, network-first for the rest
  sw.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip cross-origin requests
    if (url.origin !== sw.location.origin) return;

    if (isAppShellUrl(url, sw.location.href)) {
      // Cache-first for app shell assets
      event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request)),
      );
    } else {
      // Network-first for dynamic content
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok && event.request.method === 'GET') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            }
            return response;
          })
          .catch(() =>
            caches.match(event.request).then((cached) => {
              if (cached) return cached;
              // Offline fallback for navigation
              if (event.request.mode === 'navigate') {
                return caches.match('./');
              }
              return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
            }),
          ),
      );
    }
  });

  // Message — support SKIP_WAITING from pwa-register
  sw.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
      sw.skipWaiting();
    }
  });
}
