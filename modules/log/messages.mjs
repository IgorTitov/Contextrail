/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the log module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx log
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the log module.
 * All user-facing copy from log adapters and port assertions flows through this layer.
 *
 * SpecRefs: TPL-137
 */

const locales = {
  en: {
    'log.port.invalid_adapter': 'LogPort adapter must be a non-null object.',
    'log.port.missing_method': 'LogPort adapter must implement {method}().',
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
