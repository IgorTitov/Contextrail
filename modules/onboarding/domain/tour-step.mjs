/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Tour Step domain logic for the onboarding module.
 * @sidecar tour-step.mjs.header.md
 * @layer module | @hex domain | @ctx onboarding
 * @public false
 * @edit careful
 */

/**
 * Pure domain logic for onboarding tour steps.
 * Framework-free, no external dependencies.
 */

/**
 * @typedef {'top' | 'bottom' | 'left' | 'right'} PopoverPosition
 * @typedef {{
 *   id: string,
 *   target: string,
 *   title: string,
 *   description: string,
 *   position: PopoverPosition,
 *   order: number,
 * }} TourStep
 */

let stepCounter = 0;

/**
 * Create a tour step value object.
 *
 * @param {string} target — data-testid value or CSS selector for the highlighted element
 * @param {string} title — popover heading
 * @param {string} description — popover body text
 * @param {object} [options]
 * @param {string} [options.id]
 * @param {PopoverPosition} [options.position='bottom']
 * @param {number} [options.order=0]
 * @returns {TourStep}
 */
export function createTourStep(target, title, description, options = {}) {
  return {
    id: options.id ?? `step-${++stepCounter}`,
    target,
    title,
    description,
    position: options.position ?? 'bottom',
    order: options.order ?? 0,
  };
}

/**
 * Validate that a value looks like a well-formed TourStep.
 *
 * @param {unknown} step
 * @returns {boolean}
 */
export function isValidStep(step) {
  if (!step || typeof step !== 'object') return false;
  const s = /** @type {Record<string, unknown>} */ (step);
  return (
    typeof s.id === 'string' &&
    typeof s.target === 'string' &&
    typeof s.title === 'string' &&
    typeof s.description === 'string' &&
    typeof s.position === 'string' &&
    typeof s.order === 'number'
  );
}

/**
 * Reset the internal ID counter. Useful in tests.
 */
export function resetStepCounter() {
  stepCounter = 0;
}
