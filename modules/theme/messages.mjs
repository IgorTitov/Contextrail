/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the theme module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx theme
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the theme module.
 * All user-facing copy from theme flows through this layer.
 */

const locales = {
  en: {
    'theme.scheme.invalid': 'color scheme must be one of: light, dark, auto.',
    'theme.scheme.invalid_system': 'system preference must be one of: light, dark.',

    'theme.tokens.invalid': 'theme tokens input must be a non-null object.',
    'theme.tokens.invalid_light':
      'theme tokens "light" must be a non-null object of token name → CSS value.',
    'theme.tokens.invalid_dark':
      'theme tokens "dark" must be a non-null object of token name → CSS value.',
    'theme.tokens.invalid_key':
      'theme token key "{key}" must be kebab-case (lowercase letters, digits, and hyphens).',
    'theme.tokens.invalid_value': 'theme token "{key}" value must be a non-empty string.',
    'theme.tokens.mismatched_keys':
      'theme tokens "light" and "dark" must declare the same set of token keys.',
    'theme.tokens.unknown_scheme': 'renderCssVariables "scheme" must be one of: light, dark.',

    'theme.preference.invalid': 'theme preference input must be a non-null object.',
    'theme.preference.invalid_updated_at':
      'theme preference "updatedAt" must be a non-negative integer (epoch ms).',

    'theme.store.not_object': 'theme preference store adapter must be a non-null object.',
    'theme.store.missing_get': 'theme preference store adapter must implement get(userId).',
    'theme.store.missing_set':
      'theme preference store adapter must implement set(userId, preference).',
    'theme.store.missing_clear': 'theme preference store adapter must implement clear().',
    'theme.store.invalid_user_id': 'theme preference store requires a non-empty "userId" string.',
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
