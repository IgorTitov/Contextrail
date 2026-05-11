/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Environment Detect for the starter app.
 * @sidecar environment-detect.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Platform environment detection — granular capability probing.
 *
 * Returns a frozen capabilities object indicating which platform APIs
 * are available at runtime. Used by the adapter factory to select the
 * appropriate adapter for each hex module.
 *
 * All probes are safe to call in Node.js (return false when the API
 * is absent). Pass explicit hints to override detection in tests.
 *
 * SpecRefs: TPL-030
 *
 * @param {object} [hints] — explicit overrides for testing
 * @param {boolean} [hints.hasServiceWorker]
 * @param {boolean} [hints.hasIndexedDB]
 * @param {boolean} [hints.hasNotification]
 * @param {boolean} [hints.hasLocalStorage]
 * @param {boolean} [hints.isFileProtocol]
 * @param {boolean} [hints.hasElectronAPI]
 * @param {boolean} [hints.hasCapacitor]
 * @param {boolean} [hints.hasChromeExtensionAPI]
 * @param {boolean} [hints.isStandalone]
 * @returns {Readonly<EnvironmentCapabilities>}
 */
export function detectEnvironment(hints) {
  if (hints) {
    return Object.freeze({
      hasServiceWorker: !!hints.hasServiceWorker,
      hasIndexedDB: !!hints.hasIndexedDB,
      hasNotification: !!hints.hasNotification,
      hasLocalStorage: !!hints.hasLocalStorage,
      isFileProtocol: !!hints.isFileProtocol,
      hasElectronAPI: !!hints.hasElectronAPI,
      hasCapacitor: !!hints.hasCapacitor,
      hasChromeExtensionAPI: !!hints.hasChromeExtensionAPI,
      isStandalone: !!hints.isStandalone,
    });
  }

  return Object.freeze({
    hasServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    hasIndexedDB: typeof indexedDB !== 'undefined',
    hasNotification: typeof Notification !== 'undefined',
    hasLocalStorage: hasLocalStorageAccess(),
    isFileProtocol: typeof location !== 'undefined' && location.protocol === 'file:',
    hasElectronAPI: typeof globalThis.electronAPI !== 'undefined',
    hasCapacitor: typeof globalThis.Capacitor !== 'undefined',
    hasChromeExtensionAPI: !!globalThis.chrome?.runtime?.id,
    isStandalone: isStandaloneDisplay(),
  });
}

/**
 * Probe localStorage access. Some environments (file:// in some browsers,
 * private browsing in older Safari) throw on access.
 *
 * @returns {boolean}
 */
function hasLocalStorageAccess() {
  try {
    if (typeof localStorage === 'undefined') return false;
    const key = '__probe__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect standalone display mode (installed PWA or TWA).
 *
 * @returns {boolean}
 */
function isStandaloneDisplay() {
  if (typeof globalThis.window === 'undefined') return false;
  // iOS Safari
  if (/** @type {any} */ (globalThis.navigator).standalone === true) return true;
  // Standard matchMedia
  if (typeof globalThis.matchMedia === 'function') {
    return globalThis.matchMedia('(display-mode: standalone)').matches;
  }
  return false;
}

/**
 * @typedef {object} EnvironmentCapabilities
 * @property {boolean} hasServiceWorker — navigator.serviceWorker exists
 * @property {boolean} hasIndexedDB — indexedDB API is available
 * @property {boolean} hasNotification — Notification API is available
 * @property {boolean} hasLocalStorage — localStorage is accessible (not just defined)
 * @property {boolean} isFileProtocol — running from file:// URL
 * @property {boolean} hasElectronAPI — Electron preload bridge exists
 * @property {boolean} hasCapacitor — Capacitor native bridge exists
 * @property {boolean} hasChromeExtensionAPI — Chrome extension runtime is present
 * @property {boolean} isStandalone — running in standalone display mode (installed PWA)
 */
