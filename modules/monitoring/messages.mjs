/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the monitoring module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx monitoring
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the monitoring module.
 * All user-facing copy from monitoring flows through this layer.
 */

const locales = {
  en: {
    'monitoring.port.not_object': 'Monitoring adapter must be an object.',
    'monitoring.port.missing_capture_exception':
      'Monitoring adapter must implement captureException(error, context?).',
    'monitoring.port.missing_capture_message':
      'Monitoring adapter must implement captureMessage(message, severity?, context?).',
    'monitoring.port.missing_increment':
      'Monitoring adapter must implement increment(name, value?, tags?).',
    'monitoring.port.missing_gauge': 'Monitoring adapter must implement gauge(name, value, tags?).',
    'monitoring.port.missing_histogram':
      'Monitoring adapter must implement histogram(name, value, tags?).',
    'monitoring.port.missing_start_span':
      'Monitoring adapter must implement startSpan(name, attributes?).',
    'monitoring.port.missing_flush': 'Monitoring adapter must implement flush().',
    'monitoring.event.invalid_message': 'Monitoring message must be a non-empty string.',
    'monitoring.event.invalid_severity': 'Monitoring severity is not recognised.',
    'monitoring.event.invalid_timestamp': 'Monitoring timestamp must be a number.',
    'monitoring.metric.invalid_kind': 'Metric kind must be one of counter, gauge, histogram.',
    'monitoring.metric.invalid_name': 'Metric name must be a non-empty string.',
    'monitoring.metric.invalid_value': 'Metric value must be a number.',
    'monitoring.span.invalid_pending': 'Pending span record is invalid.',
    'monitoring.span.invalid_status': 'Span status must be ok or error.',
    'monitoring.config.invalid_sample_rate':
      'Monitoring sampleRate must be a number between 0 and 1.',
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
