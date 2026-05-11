/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the scheduler module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx scheduler
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the scheduler module.
 * All user-facing copy from scheduler adapters flows through this layer.
 *
 * SpecRefs: TPL-168
 */

const locales = {
  en: {
    'scheduler.port.not_object': 'SchedulerPort adapter must be a non-null object.',
    'scheduler.port.missing_method': 'SchedulerPort adapter must implement {method}().',
    'scheduler.cron.invalid':
      'Invalid cron-like expression: "{expression}". Expected format: "every Ns", "every Nm", "every Nh", or "every Nd".',
    'scheduler.schedule.not_found': 'Schedule not found: {id}.',
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
