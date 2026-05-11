/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Bounded UI selector registry for the starter app.
 * @sidecar ui-selectors.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Bounded selector registry for the notification feature.
 */
export const notifications = {
  /** data-testid for the toast container */
  container: 'toast-container',
  /** data-testid for an individual toast */
  toast: 'toast',
  /** data-testid for the close button on a toast */
  closeButton: 'toast-close',
};
