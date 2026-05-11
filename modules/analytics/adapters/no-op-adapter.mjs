/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose No Op adapter for the analytics module.
 * @sidecar no-op-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx analytics
 * @public false
 * @edit careful
 */

/**
 * No-op analytics adapter.
 * All methods are silent no-ops. Consent is always denied.
 * Useful as a safe default when analytics is disabled.
 *
 * @returns {import('../ports/analytics-port.mjs').AnalyticsPort}
 */
export function createAnalyticsNoOpAdapter() {
  return {
    track() {},
    identify() {},
    page() {},
    setProperties() {},
    reset() {},
    getConsent() {
      return { analytics: false, behavioral: false };
    },
    setConsent() {},
  };
}
