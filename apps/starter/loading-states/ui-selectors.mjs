/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Bounded UI selector registry for the starter app.
 * @sidecar ui-selectors.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Bounded selector registry for the loading states feature.
 */
export const loading = {
  /** data-testid for the spinner */
  spinner: 'loading-spinner',
  /** data-testid for the skeleton placeholder */
  skeleton: 'loading-skeleton',
  /** data-testid for the loading overlay */
  overlay: 'loading-overlay',
};
