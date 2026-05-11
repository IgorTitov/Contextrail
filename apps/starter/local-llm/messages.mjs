/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide the app-level i18n layer for the Local LLM UI in the starter app, supplying panel labels, status strings, and capability warning copy for local-llm-panel.mjs.
 * @sidecar messages.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the Local LLM UI in the starter app.
 *
 * SpecRefs: TPL-085
 */

const locales = {
  en: {
    'local-llm.ui.title': 'Local LLM',
    'local-llm.ui.select_model': 'Select a model',
    'local-llm.ui.load_model': 'Load Model',
    'local-llm.ui.unload_model': 'Unload Model',
    'local-llm.ui.clear_cache': 'Clear Cache',
    'local-llm.ui.status.not_loaded': 'No model loaded',
    'local-llm.ui.status.downloading': 'Downloading...',
    'local-llm.ui.status.initializing': 'Initializing...',
    'local-llm.ui.status.ready': 'Model ready',
    'local-llm.ui.status.error': 'Error loading model',
    'local-llm.ui.storage': 'Storage: {used} / {available}',
    'local-llm.ui.capability_warning':
      'Local LLM requires WebGPU or WebAssembly support. Your browser does not appear to support either.',
    'local-llm.ui.progress': '{percent}%',
    'local-llm.ui.model_size': 'Size: {size}',
    'local-llm.ui.backend': 'Backend: {backend}',
  },
};

let currentLocale = 'en';

/** @param {string} locale */
export function setLocale(locale) {
  if (!locales[locale]) {
    throw new Error(`Unknown locale: ${locale}`);
  }
  currentLocale = locale;
}

/** @returns {string} */
export function getLocale() {
  return currentLocale;
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const template = locales[currentLocale]?.[key];
  if (template == null) return key;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

/**
 * @param {string} locale
 * @param {Record<string, string>} messages
 */
export function registerLocale(locale, messages) {
  locales[locale] = { ...(locales[locale] || {}), ...messages };
}

export function resetLocale() {
  currentLocale = 'en';
}
