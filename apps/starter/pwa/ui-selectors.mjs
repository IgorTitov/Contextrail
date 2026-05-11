/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Bounded selector registry for PWA feature UI elements (install button, update banner, offline indicator).
 * @sidecar ui-selectors.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

/**
 * Bounded selector registry for the PWA feature slice.
 *
 * Usage:
 *   import { pwa } from '../../apps/starter/pwa/ui-selectors.mjs';
 *   page.getByTestId(pwa.installButton);
 *
 * Rules:
 *   - One registry per feature or visible slice, not one global table.
 *   - Only stable automation hooks belong here (data-testid, DOM id).
 *   - Presentational CSS classes stay out unless intentionally part of
 *     the testability contract.
 */

export const pwa = {
  /** data-testid for the PWA install button */
  installButton: 'pwa-install-button',

  /** data-testid for the update-available banner */
  updateBanner: 'pwa-update-banner',

  /** data-testid for the offline status indicator */
  offlineIndicator: 'pwa-offline-indicator',
};
