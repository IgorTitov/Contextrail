/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for theme-preference storage adapters (localStorage, cookies, db, etc.).
 * @sidecar theme-preference-store-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx theme
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for theme-preference storage adapters. Adapters own where
 * the preference actually lives — localStorage for a browser app, a cookie
 * for an SSR app, a `user_preferences` row for a multi-tenant backend —
 * without leaking those concerns into the pure domain. `get` returns
 * `null` when no preference is stored for the given user.
 *
 * @typedef {import('../domain/theme-preference.mjs').ThemePreference} ThemePreference
 *
 * @typedef {object} ThemePreferenceStorePort
 * @property {(userId: string) => Promise<ThemePreference | null>} get
 * @property {(userId: string, preference: ThemePreference) => Promise<ThemePreference>} set
 * @property {() => void} clear
 */

const REQUIRED = [
  ['get', 'theme.store.missing_get'],
  ['set', 'theme.store.missing_set'],
  ['clear', 'theme.store.missing_clear'],
];

/**
 * Validate that an adapter conforms to the ThemePreferenceStorePort
 * contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertThemePreferenceStorePort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('theme.store.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
