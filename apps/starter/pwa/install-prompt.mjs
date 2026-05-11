/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Capture the browser's beforeinstallprompt event and expose a programmatic install prompt API.
 * @sidecar install-prompt.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

/**
 * PWA install prompt capture and presentation.
 *
 * Listens for the `beforeinstallprompt` browser event, defers the prompt,
 * and exposes a programmatic API to trigger and observe install state.
 *
 * Usage:
 *   import { initInstallPrompt, showInstallPrompt, isInstallAvailable } from './pwa/install-prompt.mjs';
 *   initInstallPrompt();
 *   // Later, on button click:
 *   if (isInstallAvailable()) {
 *     const result = await showInstallPrompt();
 *   }
 */

/** @type {Event|null} */
let _deferredPrompt = null;

/** @type {Set<(state: { available: boolean, installed?: boolean }) => void>} */
const _stateCallbacks = new Set();

/**
 * Set up listeners for the browser install prompt events.
 * No-op in non-browser environments (Node.js).
 */
export function initInstallPrompt() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    _stateCallbacks.forEach((cb) => cb({ available: true }));
  });

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    _stateCallbacks.forEach((cb) => cb({ available: false, installed: true }));
  });
}

/**
 * Check whether a deferred install prompt is available.
 * @returns {boolean}
 */
export function isInstallAvailable() {
  return _deferredPrompt !== null;
}

/**
 * Show the install prompt to the user.
 *
 * @returns {Promise<{ outcome: string }>} The user's choice, or `{ outcome: 'unavailable' }` if no prompt.
 */
export async function showInstallPrompt() {
  if (!_deferredPrompt) return { outcome: 'unavailable' };

  _deferredPrompt.prompt();
  const result = await _deferredPrompt.userChoice;
  _deferredPrompt = null;
  _stateCallbacks.forEach((cb) =>
    cb({ available: false, installed: result.outcome === 'accepted' }),
  );
  return result;
}

/**
 * Subscribe to install state changes.
 *
 * @param {(state: { available: boolean, installed?: boolean }) => void} callback
 * @returns {() => void} Unsubscribe function.
 */
export function onInstallStateChange(callback) {
  _stateCallbacks.add(callback);
  return () => _stateCallbacks.delete(callback);
}

/**
 * Reset module state. Useful in tests.
 */
export function _reset() {
  _deferredPrompt = null;
  _stateCallbacks.clear();
}
