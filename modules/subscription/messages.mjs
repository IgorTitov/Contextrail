/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the subscription module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx subscription
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the subscription module.
 * All user-facing copy from subscription flows through this layer.
 */

const locales = {
  en: {
    'subscription.port.invalid_adapter': 'Subscription adapter must be a non-null object.',
    'subscription.port.missing_method': 'Subscription adapter missing required method: {method}.',
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
