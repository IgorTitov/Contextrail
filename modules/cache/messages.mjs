/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the cache module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx cache
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the cache module.
 * All user-facing copy from cache adapters and port assertions flows through this layer.
 *
 * SpecRefs: TPL-142
 */

const locales = {
  en: {
    'cache.port.not_object': 'CachePort adapter must be a non-null object.',
    'cache.port.missing_get': 'CachePort adapter must implement get(key).',
    'cache.port.missing_set': 'CachePort adapter must implement set(key, value, options?).',
    'cache.port.missing_delete': 'CachePort adapter must implement delete(key).',
    'cache.port.missing_has': 'CachePort adapter must implement has(key).',
    'cache.port.missing_clear': 'CachePort adapter must implement clear().',
    'cache.port.missing_size': 'CachePort adapter must implement size().',
    'cache.port.missing_keys': 'CachePort adapter must implement keys().',
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
