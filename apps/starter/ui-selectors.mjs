/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Bounded selector registry for the template's bootstrap starter feature. Product code and tests import from here instead of scattering hardcoded selector literals.
 * @sidecar ui-selectors.mjs.header.md
 * @layer apps | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

/**
 * Bounded selector registry for the bootstrap starter feature.
 *
 * Usage:
 *   import { bootstrap } from '../../apps/starter/ui-selectors.mjs';
 *   page.getByTestId(bootstrap.statusBadge);
 *
 * Rules:
 *   - One registry per feature or visible slice, not one global table.
 *   - Only stable automation hooks belong here (data-testid, DOM id).
 *   - Presentational CSS classes stay out unless intentionally part of
 *     the testability contract.
 */

export const bootstrap = {
  /** data-testid for the top-level status badge */
  statusBadge: 'status-badge',

  /** data-testid for the bootstrap checklist */
  checklist: 'bootstrap-checklist',
};
