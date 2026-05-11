/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Console adapter for the analytics module.
 * @sidecar console-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx analytics
 * @public false
 * @edit careful
 */

/**
 * Console-logging analytics adapter.
 * Logs all events in a readable format using console.group/groupEnd.
 * Respects consent state; suppresses events when consent is not granted.
 *
 * @typedef {object} ConsoleAdapterOptions
 * @property {import('../ports/analytics-port.mjs').ConsentState} [initialConsent]
 */

import { isConsentGranted, createDefaultConsent } from '../domain/consent.mjs';

/**
 * @param {ConsoleAdapterOptions} [options]
 * @returns {import('../ports/analytics-port.mjs').AnalyticsPort}
 */
export function createAnalyticsConsoleAdapter(options = {}) {
  /** @type {import('../ports/analytics-port.mjs').ConsentState} */
  let consent = options.initialConsent
    ? { ...createDefaultConsent(), ...options.initialConsent }
    : createDefaultConsent();

  /** @type {Record<string, any>} */
  let superProperties = {};
  /** @type {string | null} */
  let userId = null;
  /** @type {Record<string, any> | null} */
  let _userTraits = null;

  return {
    track(eventName, properties) {
      if (!isConsentGranted(consent, 'analytics')) return;
      const merged = { ...superProperties, ...properties };
      if (typeof console.group === 'function') {
        console.group(`[Analytics] track: ${eventName}`);
        console.log('properties:', merged);
        console.log('timestamp:', Date.now());
        if (userId) console.log('userId:', userId);
        console.groupEnd();
      } else {
        console.log(`[Analytics] track: ${eventName}`, merged);
      }
    },

    identify(id, traits) {
      if (!isConsentGranted(consent, 'analytics')) return;
      userId = id;
      _userTraits = traits ?? null;
      if (typeof console.group === 'function') {
        console.group(`[Analytics] identify: ${id}`);
        if (traits) console.log('traits:', traits);
        console.groupEnd();
      } else {
        console.log(`[Analytics] identify: ${id}`, traits);
      }
    },

    page(pageName, properties) {
      if (!isConsentGranted(consent, 'analytics')) return;
      const merged = { ...superProperties, ...properties };
      if (typeof console.group === 'function') {
        console.group(`[Analytics] page: ${pageName ?? '(unnamed)'}`);
        console.log('properties:', merged);
        console.log('timestamp:', Date.now());
        console.groupEnd();
      } else {
        console.log(`[Analytics] page: ${pageName ?? '(unnamed)'}`, merged);
      }
    },

    setProperties(properties) {
      superProperties = { ...superProperties, ...properties };
    },

    reset() {
      userId = null;
      _userTraits = null;
      superProperties = {};
    },

    getConsent() {
      return { ...consent };
    },

    setConsent(partial) {
      consent = { ...consent, ...partial };
    },
  };
}
