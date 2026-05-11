/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Tour State domain logic for the onboarding module.
 * @sidecar tour-state.mjs.header.md
 * @layer module | @hex domain | @ctx onboarding
 * @public false
 * @edit careful
 */

/**
 * Pure state machine for onboarding tours.
 * All functions are side-effect-free and return new state objects.
 */

/**
 * @typedef {import('./tour-step.mjs').TourStep} TourStep
 * @typedef {{
 *   steps: TourStep[],
 *   currentIndex: number,
 *   active: boolean,
 * }} TourState
 */

/**
 * Create the initial tour state from a list of steps.
 * Steps are sorted by their `order` field.
 *
 * @param {TourStep[]} steps
 * @returns {TourState}
 */
export function createTourState(steps) {
  return {
    steps: [...steps].sort((a, b) => a.order - b.order),
    currentIndex: -1,
    active: false,
  };
}

/**
 * Start the tour from the first step.
 * Returns the same state if the tour has no steps.
 *
 * @param {TourState} state
 * @returns {TourState}
 */
export function startTour(state) {
  if (state.steps.length === 0) return state;
  return { ...state, currentIndex: 0, active: true };
}

/**
 * Advance to the next step.
 * If on the last step, ends the tour.
 *
 * @param {TourState} state
 * @returns {TourState}
 */
export function nextStep(state) {
  if (!state.active) return state;
  if (state.currentIndex >= state.steps.length - 1) {
    return { ...state, currentIndex: -1, active: false };
  }
  return { ...state, currentIndex: state.currentIndex + 1 };
}

/**
 * Go back to the previous step.
 * No-op if already at the first step or tour is inactive.
 *
 * @param {TourState} state
 * @returns {TourState}
 */
export function previousStep(state) {
  if (!state.active || state.currentIndex <= 0) return state;
  return { ...state, currentIndex: state.currentIndex - 1 };
}

/**
 * End the tour immediately.
 *
 * @param {TourState} state
 * @returns {TourState}
 */
export function endTour(state) {
  return { ...state, currentIndex: -1, active: false };
}

/**
 * Get the current step, or null if the tour is not active.
 *
 * @param {TourState} state
 * @returns {TourStep | null}
 */
export function getCurrentStep(state) {
  if (!state.active || state.currentIndex < 0) return null;
  return state.steps[state.currentIndex] ?? null;
}

/**
 * @param {TourState} state
 * @returns {boolean}
 */
export function canAdvance(state) {
  return state.active && state.currentIndex < state.steps.length - 1;
}

/**
 * @param {TourState} state
 * @returns {boolean}
 */
export function canGoBack(state) {
  return state.active && state.currentIndex > 0;
}

/**
 * @param {TourState} state
 * @returns {boolean}
 */
export function isFirstStep(state) {
  return state.active && state.currentIndex === 0;
}

/**
 * @param {TourState} state
 * @returns {boolean}
 */
export function isLastStep(state) {
  return state.active && state.currentIndex === state.steps.length - 1;
}
