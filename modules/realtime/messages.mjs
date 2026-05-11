/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the realtime module.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the realtime module.
 * All user-facing copy from realtime adapters flows through this layer.
 *
 * SpecRefs: TPL-148, TPL-149, TPL-150, TPL-151, TPL-152, TPL-153
 */

const locales = {
  en: {
    'realtime.port.invalid_adapter': 'RealtimePort adapter must be a non-null object.',
    'realtime.port.missing_connect': 'RealtimePort adapter must implement connect().',
    'realtime.port.missing_disconnect': 'RealtimePort adapter must implement disconnect().',
    'realtime.port.missing_send': 'RealtimePort adapter must implement send().',
    'realtime.port.missing_subscribe': 'RealtimePort adapter must implement subscribe().',
    'realtime.port.missing_unsubscribe': 'RealtimePort adapter must implement unsubscribe().',
    'realtime.port.missing_on_connection_change':
      'RealtimePort adapter must implement onConnectionChange().',
    'realtime.port.missing_get_state': 'RealtimePort adapter must implement getState().',

    'realtime.transport.invalid_adapter': 'TransportPort adapter must be a non-null object.',
    'realtime.transport.missing_open': 'TransportPort adapter must implement open().',
    'realtime.transport.missing_close': 'TransportPort adapter must implement close().',
    'realtime.transport.missing_send': 'TransportPort adapter must implement send().',
    'realtime.transport.missing_on_message': 'TransportPort adapter must implement onMessage().',
    'realtime.transport.missing_on_state_change':
      'TransportPort adapter must implement onStateChange().',
    'realtime.transport.missing_get_state': 'TransportPort adapter must implement getState().',
    'realtime.transport.missing_is_supported':
      'TransportPort adapter must implement isSupported().',

    'realtime.connection.invalid_transition': 'Invalid state transition from {from} to {to}.',
    'realtime.connection.already_in_state': 'Already in state {state}.',

    'realtime.transport.connect_failed': 'Transport connection failed: {reason}.',
    'realtime.transport.send_failed': 'Failed to send data: {reason}.',
    'realtime.transport.not_connected': 'Cannot send data while not connected.',

    'realtime.reconnection.max_attempts': 'Maximum reconnection attempts ({max}) reached.',
    'realtime.reconnection.attempting': 'Reconnection attempt {attempt}.',

    'realtime.heartbeat.timeout': 'Heartbeat timed out after {timeout}ms.',

    'realtime.manager.no_supported_transport': 'No supported transport available.',
    'realtime.manager.all_transports_failed': 'All transports failed to connect.',
    'realtime.manager.fallback': 'Falling back to next transport.',
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
