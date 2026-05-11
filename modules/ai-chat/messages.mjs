/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide all user-facing i18n copy for the ai-chat module, keyed by locale, so adapters never embed raw strings directly.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx ai-chat
 * @public true
 * @edit careful
 */

/**
 * Bounded i18n messages for the ai-chat module.
 * All user-facing copy from ai-chat adapters and UI flows through this layer.
 *
 * SpecRefs: TPL-072
 */

const locales = {
  en: {
    'ai-chat.echo.prefix': 'Echo: ',
    'ai-chat.error.send_failed': 'Failed to send message. Please try again.',
    'ai-chat.error.stream_failed': 'Streaming response failed.',
    'ai-chat.error.api_error': 'AI service returned an error (status {status}).',
    'ai-chat.error.network': 'Could not reach the AI service.',
    'ai-chat.status.thinking': 'Thinking...',
    'ai-chat.status.streaming': 'Responding...',
    'ai-chat.input.placeholder': 'Type a message...',
    'ai-chat.input.send': 'Send',
    'ai-chat.history.empty': 'No messages yet. Start a conversation!',
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
