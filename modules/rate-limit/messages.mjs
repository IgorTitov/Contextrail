/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the rate-limit module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx rate-limit
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the rate-limit module.
 * All user-facing copy from rate-limit flows through this layer.
 */

const locales = {
  en: {
    'rate-limit.port.not_object': 'RateLimiter adapter must be a non-null object.',
    'rate-limit.port.missing_check': 'RateLimiter adapter must implement check(key, cost?).',
    'rate-limit.port.missing_reset': 'RateLimiter adapter must implement reset(key).',
    'rate-limit.port.missing_size': 'RateLimiter adapter must implement size().',
    'rate-limit.config.not_object': 'rate-limit config must be an object.',
    'rate-limit.config.invalid_capacity': 'rate-limit capacity must be a positive number.',
    'rate-limit.config.invalid_refill': 'rate-limit refillPerSecond must be a positive number.',
    'rate-limit.consume.invalid_cost': 'rate-limit consume cost must be a positive number.',
    'rate-limit.http.rejected': 'Too many requests. Retry in {retryAfterMs} ms.',
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
