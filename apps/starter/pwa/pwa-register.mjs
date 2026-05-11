/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Register the service worker and manage update lifecycle callbacks for PWA mode.
 * @sidecar pwa-register.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

/**
 * PWA service worker registration and update lifecycle.
 *
 * Registers the service worker only when navigator.serviceWorker is available.
 * Returns null in non-browser environments (Node.js tests, non-PWA modes).
 *
 * Usage:
 *   import { registerServiceWorker, onUpdateAvailable } from './pwa/pwa-register.mjs';
 *   const reg = await registerServiceWorker('./sw.mjs');
 *   onUpdateAvailable((registration) => { // show update banner });
 */

/** @type {Set<(reg: ServiceWorkerRegistration) => void>} */
const _updateCallbacks = new Set();

/**
 * Register a service worker and set up update detection.
 *
 * @param {string} swPath — path to the service worker file
 * @param {object} [options]
 * @param {string} [options.type] — registration type ('module' for ESM workers)
 * @returns {Promise<ServiceWorkerRegistration|null>} The registration, or null if unavailable.
 */
export async function registerServiceWorker(swPath, options = {}) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  const regOptions = {};
  if (options.type) regOptions.type = options.type;

  const registration = await navigator.serviceWorker.register(swPath, regOptions);

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        _updateCallbacks.forEach((cb) => cb(registration));
      }
    });
  });

  return registration;
}

/**
 * Subscribe to service worker update availability.
 *
 * @param {(reg: ServiceWorkerRegistration) => void} callback
 * @returns {() => void} Unsubscribe function.
 */
export function onUpdateAvailable(callback) {
  _updateCallbacks.add(callback);
  return () => _updateCallbacks.delete(callback);
}

/**
 * Tell a waiting service worker to activate immediately.
 *
 * @param {ServiceWorkerRegistration} registration
 */
export function applyUpdate(registration) {
  if (registration?.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Reset module state. Useful in tests.
 */
export function _reset() {
  _updateCallbacks.clear();
}
