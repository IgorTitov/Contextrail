/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide runtime mode detection and feature-flag resolution for the starter app as a pure ESM module with no DOM dependency.
 * @sidecar app-config.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

/**
 * App configuration — runtime mode detection and feature flags.
 *
 * Pure ESM module with no DOM dependency. Importable before any rendering.
 *
 * Usage:
 *   import { getMode, resolveConfig, setMode, MODES } from './app-config.mjs';
 *   const { mode, flags } = resolveConfig();
 *
 * Modes: hosted | pwa | local | electron | extension
 * Feature flags: pwa, offlineCache, installPrompt
 */

/** @enum {string} Supported runtime modes. */
export const MODES = Object.freeze({
  HOSTED: 'hosted',
  PWA: 'pwa',
  LOCAL: 'local',
  ELECTRON: 'electron',
  EXTENSION: 'extension',
});

const VALID_MODES = new Set(Object.values(MODES));

/** @type {{ pwa: boolean, offlineCache: boolean, installPrompt: boolean }} */
const DEFAULT_FLAGS = Object.freeze({ pwa: false, offlineCache: false, installPrompt: false });

/** Mode-specific flag defaults. */
const MODE_FLAGS = Object.freeze({
  [MODES.HOSTED]: { pwa: false, offlineCache: false, installPrompt: false },
  [MODES.PWA]: { pwa: true, offlineCache: true, installPrompt: true },
  [MODES.LOCAL]: { pwa: false, offlineCache: true, installPrompt: false },
  [MODES.ELECTRON]: { pwa: false, offlineCache: false, installPrompt: false },
  [MODES.EXTENSION]: { pwa: false, offlineCache: false, installPrompt: false },
});

let currentMode = MODES.HOSTED;

/** @type {Record<string, boolean>} */
let flagOverrides = {};

/**
 * Detect runtime mode from environment hints.
 *
 * In a browser, call with no arguments — the function reads from
 * `location.protocol`, `window.electronAPI`, `chrome.runtime`, and
 * `<meta name="app-mode">`. In tests, pass explicit hints.
 *
 * @param {object} [hints] — explicit environment signals (for testability)
 * @param {string} [hints.protocol] — e.g. 'file:', 'https:'
 * @param {boolean} [hints.hasElectronAPI] — true if window.electronAPI exists
 * @param {boolean} [hints.hasChromeRuntime] — true if chrome.runtime exists
 * @param {boolean} [hints.pwaMeta] — true if <meta name="app-mode" content="pwa">
 * @returns {string} Detected mode (falls back to MODES.HOSTED).
 */
export function detectMode(hints) {
  const h = hints ?? gatherBrowserHints();

  // Wrapper environments take priority
  if (h.hasElectronAPI) return MODES.ELECTRON;
  if (h.hasChromeRuntime) return MODES.EXTENSION;

  // PWA meta tag
  if (h.pwaMeta) return MODES.PWA;

  // File protocol
  if (h.protocol === 'file:') return MODES.LOCAL;

  return MODES.HOSTED;
}

/** @returns {object} Hints gathered from the browser environment (no-op in Node). */
function gatherBrowserHints() {
  if (typeof globalThis.window === 'undefined') {
    return {};
  }
  return {
    protocol: globalThis.location?.protocol,
    hasElectronAPI: !!globalThis.electronAPI,
    hasChromeRuntime: !!globalThis.chrome?.runtime?.id,
    pwaMeta: !!globalThis.document?.querySelector('meta[name="app-mode"][content="pwa"]'),
  };
}

/**
 * Get the current runtime mode.
 * @returns {string}
 */
export function getMode() {
  return currentMode;
}

/**
 * Manually set the runtime mode.
 * @param {string} mode — one of MODES values
 * @throws {Error} if the mode is not recognized
 */
export function setMode(mode) {
  if (!VALID_MODES.has(mode)) {
    throw new Error(`Unknown mode: ${mode}. Expected one of: ${[...VALID_MODES].join(', ')}`);
  }
  currentMode = mode;
}

/**
 * Get the current feature flags (mode defaults merged with manual overrides).
 * @returns {{ pwa: boolean, offlineCache: boolean, installPrompt: boolean }}
 */
export function getFeatureFlags() {
  const modeDefaults = MODE_FLAGS[currentMode] ?? DEFAULT_FLAGS;
  return { ...modeDefaults, ...flagOverrides };
}

/**
 * Override a single feature flag.
 * @param {string} name — flag name
 * @param {boolean} value
 * @throws {Error} if the flag name is not recognized
 */
export function setFeatureFlag(name, value) {
  if (!(name in DEFAULT_FLAGS)) {
    throw new Error(
      `Unknown feature flag: ${name}. Expected one of: ${Object.keys(DEFAULT_FLAGS).join(', ')}`,
    );
  }
  flagOverrides[name] = value;
}

/**
 * Get the fully resolved config (mode + flags).
 * @returns {{ mode: string, flags: { pwa: boolean, offlineCache: boolean, installPrompt: boolean } }}
 */
export function resolveConfig() {
  return { mode: currentMode, flags: getFeatureFlags() };
}

/**
 * Reset to default state. Useful in tests.
 */
export function resetConfig() {
  currentMode = MODES.HOSTED;
  flagOverrides = {};
}
