/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Bounded UI selector registry for the starter app.
 * @sidecar ui-selectors.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Bounded selector registry for the onboarding feature.
 * One registry per feature, not a global table.
 *
 * Used by both product code (DOM adapter) and tests for consistency.
 */
export const onboarding = {
  backdrop: 'onboarding-backdrop',
  spotlight: 'onboarding-spotlight',
  popover: 'onboarding-popover',
  title: 'onboarding-title',
  description: 'onboarding-description',
  counter: 'onboarding-counter',
  nextButton: 'onboarding-next',
  prevButton: 'onboarding-prev',
  closeButton: 'onboarding-close',
};
