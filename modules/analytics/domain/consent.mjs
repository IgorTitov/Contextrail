/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Consent domain logic for the analytics module.
 * @sidecar consent.mjs.header.md
 * @layer module | @hex domain | @ctx analytics
 * @public false
 * @edit careful
 */

/**
 * Consent domain logic for the analytics module.
 * Privacy-first: everything off by default.
 */

/**
 * Check if consent is granted for a given category.
 *
 * @param {import('../ports/analytics-port.mjs').ConsentState} consent
 * @param {'analytics'|'behavioral'} category
 * @returns {boolean}
 */
export function isConsentGranted(consent, category) {
  if (!consent || typeof consent !== 'object') return false;
  return consent[category] === true;
}

/**
 * Check if the user's browser has Do Not Track enabled.
 * Returns true if navigator.doNotTrack === '1', meaning analytics should be suppressed.
 *
 * @returns {boolean}
 */
export function respectsDoNotTrack() {
  if (typeof navigator === 'undefined') return false;
  return navigator.doNotTrack === '1';
}

/**
 * Create the default consent state with everything off.
 *
 * @returns {import('../ports/analytics-port.mjs').ConsentState}
 */
export function createDefaultConsent() {
  return { analytics: false, behavioral: false };
}
