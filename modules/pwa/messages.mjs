/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the pwa module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx pwa
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the pwa module.
 * All user-facing copy from pwa flows through this layer.
 */

const locales = {
  en: {
    'pwa.manifest.invalid': 'web manifest input must be a non-null object.',
    'pwa.manifest.invalid_name': 'web manifest "name" must be a non-empty string.',
    'pwa.manifest.invalid_short_name': 'web manifest "shortName" must be a non-empty string.',
    'pwa.manifest.invalid_start_url': 'web manifest "startUrl" must be a non-empty string.',
    'pwa.manifest.invalid_display':
      'web manifest "display" must be one of: fullscreen, standalone, minimal-ui, browser.',
    'pwa.manifest.invalid_color':
      'web manifest "{field}" must be a CSS color string when provided.',
    'pwa.manifest.invalid_icons': 'web manifest "icons" must be an array of icon descriptors.',
    'pwa.manifest.invalid_icon_entry':
      'web manifest icon entry must have a non-empty "src" string and a "sizes" string.',

    'pwa.cache.invalid_type':
      'cache strategy type must be one of: cacheFirst, networkFirst, staleWhileRevalidate, networkOnly, cacheOnly.',
    'pwa.cache.invalid_cache_name': 'cache strategy "cacheName" must be a non-empty string.',
    'pwa.cache.invalid_max_entries':
      'cache strategy "maxEntries" must be a positive integer when provided.',
    'pwa.cache.invalid_max_age':
      'cache strategy "maxAgeSeconds" must be a positive integer when provided.',

    'pwa.sw.invalid': 'service worker source input must be a non-null object.',
    'pwa.sw.invalid_cache_name': 'service worker "cacheName" must be a non-empty string.',
    'pwa.sw.invalid_version': 'service worker "version" must be a non-empty string.',
    'pwa.sw.invalid_precache': 'service worker "precache" must be an array of URL strings.',
    'pwa.sw.invalid_runtime': 'service worker "runtime" must be an array of runtime rules.',
    'pwa.sw.invalid_runtime_entry':
      'service worker runtime entry must have a non-empty "urlPattern" string and a "strategy" object.',

    'pwa.asset_store.not_object': 'PWA asset store adapter must be a non-null object.',
    'pwa.asset_store.missing_writeManifest':
      'PWA asset store adapter must implement writeManifest(manifest).',
    'pwa.asset_store.missing_writeServiceWorker':
      'PWA asset store adapter must implement writeServiceWorker(source).',
    'pwa.asset_store.missing_listAssets': 'PWA asset store adapter must implement listAssets().',
    'pwa.asset_store.missing_clear': 'PWA asset store adapter must implement clear().',
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
