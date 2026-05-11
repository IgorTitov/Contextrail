/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the analytics module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx analytics
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the analytics module.
 * All user-facing copy from analytics adapters flows through this layer.
 */

const locales = {
  en: {
    'analytics.port.invalid_adapter': 'AnalyticsPort adapter must be a non-null object.',
    'analytics.port.missing_track': 'AnalyticsPort adapter must implement track().',
    'analytics.port.missing_identify': 'AnalyticsPort adapter must implement identify().',
    'analytics.port.missing_page': 'AnalyticsPort adapter must implement page().',
    'analytics.port.missing_setProperties': 'AnalyticsPort adapter must implement setProperties().',
    'analytics.port.missing_reset': 'AnalyticsPort adapter must implement reset().',
    'analytics.port.missing_getConsent': 'AnalyticsPort adapter must implement getConsent().',
    'analytics.port.missing_setConsent': 'AnalyticsPort adapter must implement setConsent().',
    'analytics.consent.denied': 'Analytics event suppressed: consent not granted.',
    'analytics.consent.dnt_respected': 'Analytics disabled: Do Not Track is enabled.',
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
