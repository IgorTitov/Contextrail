/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Onboarding port contract for the onboarding module.
 * @sidecar onboarding-port.mjs.header.md
 * @layer module | @hex port | @ctx onboarding
 * @public false
 * @edit careful
 */

/**
 * Port contract for onboarding tour adapters.
 *
 * @typedef {object} OnboardingPort
 * @property {(steps: import('../domain/tour-step.mjs').TourStep[]) => void} startTour
 * @property {() => void} endTour
 * @property {() => void} nextStep
 * @property {() => void} previousStep
 * @property {() => boolean} isActive
 * @property {() => number} getCurrentIndex
 * @property {() => void} destroy
 */

const REQUIRED_METHODS = [
  'startTour',
  'endTour',
  'nextStep',
  'previousStep',
  'isActive',
  'getCurrentIndex',
  'destroy',
];

/**
 * Validate that an adapter conforms to the OnboardingPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertOnboardingPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('OnboardingPort adapter must be a non-null object');
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(`OnboardingPort adapter must implement ${method}()`);
    }
  }
}
