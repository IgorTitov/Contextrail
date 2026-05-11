/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the task module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx task
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the task module.
 * All user-facing copy from task adapters flows through this layer.
 */

const locales = {
  en: {
    'task.port.adapter_must_be_object': 'TaskPort adapter must be a non-null object.',
    'task.port.missing_enqueue': 'TaskPort adapter must implement enqueue().',
    'task.port.missing_cancel': 'TaskPort adapter must implement cancel().',
    'task.port.missing_getStatus': 'TaskPort adapter must implement getStatus().',
    'task.port.missing_onProgress': 'TaskPort adapter must implement onProgress().',
    'task.port.missing_onComplete': 'TaskPort adapter must implement onComplete().',
    'task.port.missing_drain': 'TaskPort adapter must implement drain().',
    'task.lifecycle.invalid_transition': 'Invalid task state transition from "{from}" to "{to}".',
    'task.lifecycle.already_terminal': 'Task is already in terminal state "{status}".',
    'task.timeout': 'Task "{taskId}" exceeded timeout of {timeout}ms.',
    'task.cancelled': 'Task "{taskId}" was cancelled.',
    'task.serialize.invalid_transferable':
      'Transferable at index {index} is not a valid transferable type.',
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
