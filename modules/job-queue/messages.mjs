/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the job-queue module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx job-queue
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the job-queue module.
 * All user-facing copy from job-queue flows through this layer.
 */

const locales = {
  en: {
    'job-queue.port.not_object': 'JobQueue adapter must be a non-null object.',
    'job-queue.port.missing_enqueue':
      'JobQueue adapter must implement enqueue(name, payload, options?).',
    'job-queue.port.missing_dequeue': 'JobQueue adapter must implement dequeue().',
    'job-queue.port.missing_complete': 'JobQueue adapter must implement complete(id).',
    'job-queue.port.missing_fail': 'JobQueue adapter must implement fail(id, error).',
    'job-queue.port.missing_list': 'JobQueue adapter must implement list(status?).',
    'job-queue.port.missing_size': 'JobQueue adapter must implement size(status?).',
    'job-queue.enqueue.invalid_name': 'job-queue enqueue name must be a non-empty string.',
    'job-queue.enqueue.invalid_options': 'job-queue enqueue options must be an object.',
    'job-queue.enqueue.invalid_max_attempts': 'job-queue maxAttempts must be a positive integer.',
    'job-queue.enqueue.invalid_delay': 'job-queue delayMs must be a non-negative number.',
    'job-queue.fail.unknown_job': 'job-queue fail: unknown job id {id}.',
    'job-queue.complete.unknown_job': 'job-queue complete: unknown job id {id}.',
    'job-queue.backoff.invalid_attempt': 'job-queue backoff attempt must be a positive integer.',
    'job-queue.backoff.invalid_base': 'job-queue backoff baseMs must be a positive number.',
    'job-queue.worker.invalid_config': 'job-queue worker config must be an object.',
    'job-queue.worker.invalid_handlers':
      'job-queue worker handlers must be a non-empty object of functions.',
    'job-queue.worker.unknown_handler': 'job-queue worker has no handler for job {name}.',
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
