/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide all user-facing i18n copy for the AI chat UI in the starter app, scoped to presentation strings that components must not hardcode directly.
 * @sidecar messages.mjs.header.md
 * @layer app | @hex _none_ | @ctx ai-chat
 * @public true
 * @edit careful
 */

/**
 * Bounded i18n messages for the AI chat UI in the starter app.
 *
 * SpecRefs: TPL-077
 */

const locales = {
  en: {
    'ai-chat.ui.placeholder': 'Type a message...',
    'ai-chat.ui.send': 'Send',
    'ai-chat.ui.thinking': 'Thinking...',
    'ai-chat.ui.empty': 'No messages yet. Start a conversation!',
    'ai-chat.ui.title': 'AI Chat',
    'ai-chat.ui.clear': 'Clear chat',
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
