/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure color-scheme enum + validator + preference/system resolver.
 * @sidecar color-scheme.mjs.header.md
 * @layer domain | @hex _none_ | @ctx theme
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Color-scheme primitive. Domain has exactly three user-selectable values
 * — LIGHT, DARK, AUTO — and a two-value system preference (LIGHT | DARK).
 * AUTO defers to the system preference at resolution time. Pure — no DOM,
 * no `matchMedia`, no storage. Adapters observe `prefers-color-scheme` and
 * pass the observed system value into `resolveColorScheme`.
 *
 * @typedef {'light'|'dark'|'auto'} ColorScheme
 * @typedef {'light'|'dark'} SystemColorScheme
 */

export const LIGHT = /** @type {const} */ ('light');
export const DARK = /** @type {const} */ ('dark');
export const AUTO = /** @type {const} */ ('auto');

const USER_SCHEMES = new Set([LIGHT, DARK, AUTO]);
const SYSTEM_SCHEMES = new Set([LIGHT, DARK]);

/**
 * @param {unknown} value
 * @returns {value is ColorScheme}
 */
export function isValidColorScheme(value) {
  return typeof value === 'string' && USER_SCHEMES.has(/** @type {ColorScheme} */ (value));
}

/**
 * @param {unknown} value
 * @returns {value is SystemColorScheme}
 */
export function isValidSystemColorScheme(value) {
  return typeof value === 'string' && SYSTEM_SCHEMES.has(/** @type {SystemColorScheme} */ (value));
}

/**
 * Resolve a user preference (possibly `auto`) against the observed system
 * preference into a concrete `light` | `dark` value. Pure — does not read
 * `matchMedia`; callers pass the system preference as an argument.
 *
 * @param {ColorScheme} preference
 * @param {SystemColorScheme} systemPreference
 * @returns {SystemColorScheme}
 */
export function resolveColorScheme(preference, systemPreference) {
  if (!isValidColorScheme(preference)) {
    throw new TypeError(t('theme.scheme.invalid'));
  }
  if (!isValidSystemColorScheme(systemPreference)) {
    throw new TypeError(t('theme.scheme.invalid_system'));
  }
  if (preference === AUTO) return systemPreference;
  return /** @type {SystemColorScheme} */ (preference);
}
