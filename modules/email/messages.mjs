/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the email module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx email
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the email module.
 * All user-facing copy from email flows through this layer.
 */

const locales = {
  en: {
    'email.port.not_object': 'Email adapter must be a non-null object.',
    'email.port.missing_send': 'Email adapter must implement send(message).',
    'email.port.missing_list': 'Email adapter must implement list(status?).',
    'email.port.missing_clear': 'Email adapter must implement clear().',
    'email.message.invalid': 'email message must be a non-null object.',
    'email.message.missing_from': 'email message "from" must be a non-empty string.',
    'email.message.missing_to': 'email message "to" must be a non-empty string or string[].',
    'email.message.missing_subject': 'email message "subject" must be a non-empty string.',
    'email.message.missing_body': 'email message must include "text" or "html" body.',
    'email.message.invalid_address': 'email address "{address}" is not a valid email.',
    'email.message.invalid_list': 'email recipient list must contain only non-empty strings.',
    'email.adapter.console.failed': 'console email adapter logged error: {error}',
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
