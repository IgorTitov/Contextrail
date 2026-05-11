/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the event-bus module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx event-bus
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the event-bus module.
 * All user-facing copy from event-bus adapters flows through this layer.
 */

const locales = {
  en: {
    'event-bus.port.invalid_adapter': 'EventBusPort adapter must be a non-null object.',
    'event-bus.port.missing_method': 'EventBusPort adapter must implement {method}().',
    'event-bus.domain.handler_not_function': 'Event handler must be a function.',
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
