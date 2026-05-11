/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide the bounded i18n layer for the local-llm module, supplying error and status strings consumed by adapters and the model cache manager.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx local-llm
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the local-llm module.
 * All user-facing copy from local-llm adapters and UI flows through this layer.
 *
 * SpecRefs: TPL-080
 */

const locales = {
  en: {
    'local-llm.error.no_model': 'No model is loaded. Please load a model before sending messages.',
    'local-llm.error.load_failed': 'Failed to load model: {reason}',
    'local-llm.error.webgpu_unavailable':
      'WebGPU is not available in this browser. WebLLM requires WebGPU support.',
    'local-llm.error.wasm_unavailable':
      'WebAssembly is not available in this environment. Transformers.js requires WASM support.',
    'local-llm.error.send_failed': 'Failed to generate response: {reason}',
    'local-llm.error.stream_failed': 'Streaming response failed: {reason}',
    'local-llm.error.storage_unavailable': 'Browser storage APIs are not available.',
    'local-llm.error.cache_clear_failed': 'Failed to clear model cache: {reason}',
    'local-llm.status.downloading': 'Downloading model...',
    'local-llm.status.initializing': 'Initializing model...',
    'local-llm.status.ready': 'Model ready',
    'local-llm.status.unloading': 'Unloading model...',
    'local-llm.progress.download': 'Downloading: {percent}%',
    'local-llm.progress.init': 'Initializing: {percent}%',
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
