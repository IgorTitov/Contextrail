/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Bounded UI selector registry for the react-starter app.
 * @sidecar selectors.js.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Bounded selector registry for the React starter.
 *
 * Same pattern as apps/starter/ui-selectors.mjs — stable automation-facing
 * hooks in one place. Tests and components import from here.
 */

export const selectors = {
  header: 'site-header',
  main: 'site-main',
  themeToggle: 'theme-toggle',
  notifyButton: 'notify-button',
  toastList: 'toast-list',
  toastItem: 'toast-item',
  dismissButton: 'toast-dismiss',
  localeSwitch: 'locale-switch',
};
