/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the feature-seams module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the feature-seams module.
 * All user-facing copy from feature-seams flows through this layer.
 */

const locales = {
  en: {
    'feature-seams.port.invalid_adapter': 'SeamPort adapter must be a non-null object.',
    'feature-seams.port.missing_method': 'SeamPort adapter must implement {method}().',
    'feature-seams.domain.already_registered': 'Seam "{flag}" is already registered.',
    'feature-seams.domain.invalid_state': 'Invalid seam state: "{state}".',
    'feature-seams.domain.not_registered': 'Seam "{flag}" is not registered.',
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
