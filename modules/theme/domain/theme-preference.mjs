/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure immutable theme-preference record with validation.
 * @sidecar theme-preference.mjs.header.md
 * @layer domain | @hex _none_ | @ctx theme
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';
import { isValidColorScheme } from './color-scheme.mjs';

/**
 * Immutable value object representing a stored theme preference for one
 * user. Adapters persist and retrieve this record behind the
 * `ThemePreferenceStorePort`.
 *
 * @typedef {import('./color-scheme.mjs').ColorScheme} ColorScheme
 *
 * @typedef {object} ThemePreference
 * @property {ColorScheme} scheme
 * @property {number} updatedAt  Epoch ms the preference was last changed.
 */

/**
 * @param {{ scheme: ColorScheme, updatedAt: number }} input
 * @returns {Readonly<ThemePreference>}
 */
export function createThemePreference(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('theme.preference.invalid'));
  }
  if (!isValidColorScheme(input.scheme)) {
    throw new TypeError(t('theme.scheme.invalid'));
  }
  if (
    typeof input.updatedAt !== 'number' ||
    !Number.isFinite(input.updatedAt) ||
    input.updatedAt < 0 ||
    !Number.isInteger(input.updatedAt)
  ) {
    throw new TypeError(t('theme.preference.invalid_updated_at'));
  }
  return Object.freeze({ scheme: input.scheme, updatedAt: input.updatedAt });
}
