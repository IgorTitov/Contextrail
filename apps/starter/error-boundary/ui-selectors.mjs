/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Bounded UI selector registry for the starter app.
 * @sidecar ui-selectors.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Bounded selector registry for the error boundary feature.
 */
export const errorBoundary = {
  /** data-testid for the error fallback container */
  container: 'error-fallback',
  /** data-testid for the error title */
  title: 'error-fallback-title',
  /** data-testid for the retry button */
  retryButton: 'error-retry-button',
};
