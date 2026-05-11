/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the permission module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx permission
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the permission module.
 * All user-facing copy from permission adapters flows through this layer.
 */

const locales = {
  en: {
    'permission.port.invalid_adapter': 'PermissionPort adapter must be a non-null object.',
    'permission.port.missing_method': 'PermissionPort adapter must implement {method}().',
    'permission.access_denied': 'Access denied: {action} on {resource}.',
    'permission.missing_user': 'No user set. Call setUser() before checking permissions.',
    'permission.missing_check_fn': 'No check function provided for dynamic permission adapter.',
    'permission.missing_grant_fn': 'No grantFn provided. Cannot grant rules dynamically.',
    'permission.missing_revoke_fn': 'No revokeFn provided. Cannot revoke rules dynamically.',
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
