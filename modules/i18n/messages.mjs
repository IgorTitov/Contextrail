/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the i18n module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx i18n
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the i18n module.
 * All user-facing copy from i18n adapters and port assertions flows through this layer.
 */

const locales = {
  en: {
    'i18n.port.invalid_adapter': 'I18nPort adapter must be a non-null object.',
    'i18n.port.missing_method': 'I18nPort adapter must implement {method}().',
    'i18n.registry.invalid_namespace': 'Namespace must be a non-empty string.',
    'i18n.registry.invalid_locale': 'Locale must be a non-empty string.',
    'i18n.registry.invalid_messages': 'Messages must be a non-null object.',
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
