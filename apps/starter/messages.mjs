/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n messages for the starter app.
 * @sidecar messages.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages layer for the bootstrap starter feature.
 *
 * This is the concrete example of the i18n/messages pattern mandated by the
 * project rules: "All user-facing UI copy must go through a simple i18n/messages
 * layer from day one, even if the app initially ships with only one locale."
 *
 * Usage:
 *   import { t, setLocale } from '../../apps/starter/messages.mjs';
 *   console.log(t('greeting.hello', { name: 'Alice' })); // → "Hello, Alice!"
 *   setLocale('es');
 *   console.log(t('greeting.hello', { name: 'Alice' })); // → "¡Hola, Alice!"
 *
 * Rules:
 *   - One messages module per feature or bounded slice, not one global table.
 *   - All user-facing strings come from here — never hardcode UI copy.
 *   - Register additional locales via registerLocale().
 *   - Falls back to the message key when a key is missing.
 */

const locales = {
  en: {
    'greeting.hello': 'Hello, {name}!',
    'status.ready': 'Ready',
    'status.loading': 'Loading\u2026',
  },
};

let currentLocale = 'en';

/**
 * Set the active locale.
 * @param {string} locale
 * @throws {Error} if the locale has not been registered.
 */
export function setLocale(locale) {
  if (!locales[locale]) {
    throw new Error(`Unknown locale: ${locale}`);
  }
  currentLocale = locale;
}

/** Return the active locale key. */
export function getLocale() {
  return currentLocale;
}

/**
 * Translate a message key, interpolating `{param}` placeholders.
 *
 * @param {string} key     Dot-namespaced message key.
 * @param {Record<string, string|number>} [params] Replacement values.
 * @returns {string} The resolved message, or the raw key if not found.
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
 * Register (or extend) a locale's message catalog.
 *
 * @param {string} locale   Locale key (e.g. 'es', 'fr').
 * @param {Record<string, string>} messages  Key→template map.
 */
export function registerLocale(locale, messages) {
  locales[locale] = { ...(locales[locale] || {}), ...messages };
}

/**
 * Reset to the default locale. Useful in tests.
 */
export function resetLocale() {
  currentLocale = 'en';
}
