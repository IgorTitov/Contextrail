/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide all user-facing i18n copy for the api-client module, keyed by locale, so adapters never embed raw error or status strings directly.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx api-client
 * @public true
 * @edit careful
 */

/**
 * Bounded i18n messages for the api-client module.
 * All user-facing copy from API client adapters flows through this layer.
 *
 * SpecRefs: TPL-062
 */

const locales = {
  en: {
    'api-client.error.request_failed': 'The request failed. Please try again.',
    'api-client.error.network_failure': 'Network error. Check your connection and try again.',
    'api-client.error.timeout': 'The request timed out. Please try again.',
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
