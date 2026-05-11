/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the onboarding module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx onboarding
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the onboarding module.
 * All user-facing copy from onboarding adapters and port assertions flows through this layer.
 */

const locales = {
  en: {
    'onboarding.port.invalid_adapter': 'OnboardingPort adapter must be a non-null object.',
    'onboarding.port.missing_method': 'OnboardingPort adapter must implement {method}().',
    'onboarding.btn.next': 'Next',
    'onboarding.btn.back': 'Back',
    'onboarding.btn.done': 'Done',
    'onboarding.btn.close_label': 'Close tour',
    'onboarding.counter': '{current} / {total}',
    'onboarding.dialog_label': 'Guided tour',
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
