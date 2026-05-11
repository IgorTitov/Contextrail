/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Analytics port contract for the analytics module.
 * @sidecar analytics-port.mjs.header.md
 * @layer module | @hex port | @ctx analytics
 * @public false
 * @edit careful
 */

/**
 * Port contract for analytics adapters.
 *
 * @typedef {object} AnalyticsEvent
 * @property {string} name
 * @property {Record<string, any>} [properties]
 * @property {number} timestamp
 */

/**
 * @typedef {object} ConsentState
 * @property {boolean} analytics
 * @property {boolean} behavioral
 */

/**
 * @typedef {object} SessionInfo
 * @property {string} sessionId
 * @property {number} startedAt
 * @property {number} pageViews
 * @property {number} lastActivity
 */

/**
 * @typedef {object} BehavioralEvent
 * @property {'click'|'scroll'|'visibility'|'mouse'} type
 * @property {Record<string, any>} data
 * @property {number} timestamp
 */

/**
 * @typedef {object} AnalyticsPort
 * @property {(eventName: string, properties?: Record<string, any>) => void} track
 * @property {(userId: string, traits?: Record<string, any>) => void} identify
 * @property {(pageName?: string, properties?: Record<string, any>) => void} page
 * @property {(properties: Record<string, any>) => void} setProperties
 * @property {() => void} reset
 * @property {() => ConsentState} getConsent
 * @property {(consent: Partial<ConsentState>) => void} setConsent
 */

import { t } from '../messages.mjs';

/**
 * Validate that an adapter conforms to the AnalyticsPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertAnalyticsPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('analytics.port.invalid_adapter'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);

  const methods = [
    ['track', 'missing_track'],
    ['identify', 'missing_identify'],
    ['page', 'missing_page'],
    ['setProperties', 'missing_setProperties'],
    ['reset', 'missing_reset'],
    ['getConsent', 'missing_getConsent'],
    ['setConsent', 'missing_setConsent'],
  ];

  for (const [method, key] of methods) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(`analytics.port.${key}`));
    }
  }
}
