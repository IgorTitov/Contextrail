/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the cqrs module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx cqrs
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the cqrs module.
 * All user-facing copy from cqrs flows through this layer.
 */

const locales = {
  en: {
    'cqrs.command.invalid': 'command input must be a non-null object.',
    'cqrs.command.invalid_type':
      'command type must be a non-empty string in "domain.action" or "Domain.Action" shape.',
    'cqrs.command.invalid_payload': 'command payload must be a plain object (not array, not null).',
    'cqrs.command.invalid_metadata': 'command metadata must be a flat string map when provided.',

    'cqrs.query.invalid': 'query input must be a non-null object.',
    'cqrs.query.invalid_type':
      'query type must be a non-empty string in "domain.action" or "Domain.Action" shape.',
    'cqrs.query.invalid_payload': 'query payload must be a plain object (not array, not null).',
    'cqrs.query.invalid_metadata': 'query metadata must be a flat string map when provided.',

    'cqrs.event.invalid': 'event input must be a non-null object.',
    'cqrs.event.invalid_type': 'event type must be a non-empty string in "Aggregate.Verbed" shape.',
    'cqrs.event.invalid_aggregate': 'event aggregateId must be a non-empty string.',
    'cqrs.event.invalid_payload': 'event payload must be a plain object (not array, not null).',
    'cqrs.event.invalid_metadata': 'event metadata must be a flat string map when provided.',

    'cqrs.bus.not_object': 'cqrs bus adapter must be a non-null object.',
    'cqrs.bus.missing_register': 'cqrs bus adapter must implement register(type, handler).',
    'cqrs.bus.missing_dispatch': 'cqrs command bus adapter must implement dispatch(command).',
    'cqrs.bus.missing_ask': 'cqrs query bus adapter must implement ask(query).',
    'cqrs.bus.missing_clear': 'cqrs bus adapter must implement clear().',
    'cqrs.bus.duplicate_handler': 'cqrs bus already has a handler registered for type "{type}".',
    'cqrs.bus.no_handler': 'cqrs bus has no handler registered for type "{type}".',

    'cqrs.event_store.not_object': 'cqrs event store adapter must be a non-null object.',
    'cqrs.event_store.missing_append':
      'cqrs event store adapter must implement append(aggregateId, expectedVersion, events).',
    'cqrs.event_store.missing_load': 'cqrs event store adapter must implement load(aggregateId).',
    'cqrs.event_store.missing_loadAll': 'cqrs event store adapter must implement loadAll(filter?).',
    'cqrs.event_store.missing_subscribe':
      'cqrs event store adapter must implement subscribe(listener).',
    'cqrs.event_store.missing_clear': 'cqrs event store adapter must implement clear().',
    'cqrs.event_store.version_conflict':
      'cqrs event store version conflict for aggregate "{id}": expected {expected}, actual {actual}.',

    'cqrs.aggregate.invalid': 'aggregate input must be a non-null object with an id.',
    'cqrs.aggregate.invalid_reducer':
      'aggregate reducer must be a function (state, event) => state.',
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
