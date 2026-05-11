/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the form-validation module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx form-validation
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the form-validation module.
 * All user-facing validation copy flows through this layer.
 *
 * SpecRefs: TPL-146
 */

const locales = {
  en: {
    'form-validation.required': 'This field is required.',
    'form-validation.min_length': 'Must be at least {min} characters.',
    'form-validation.max_length': 'Must be at most {max} characters.',
    'form-validation.pattern': 'Invalid format.',
    'form-validation.email': 'Please enter a valid email address.',
    'form-validation.matches': 'Must match the {field} field.',
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
