/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory ThemePreferenceStorePort adapter — Map-backed user→preference store for tests and dev.
 * @sidecar memory-theme-preference-store.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx theme
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * In-memory ThemePreferenceStorePort adapter. Backs a deterministic fake
 * for tests, local development, and the api-starter demo. Returns
 * defensive copies so callers cannot mutate internal records.
 *
 * @returns {import('../ports/theme-preference-store-port.mjs').ThemePreferenceStorePort & {
 *   size: () => number,
 * }}
 */
export function createMemoryThemePreferenceStore() {
  /** @type {Map<string, import('../domain/theme-preference.mjs').ThemePreference>} */
  const preferences = new Map();

  function requireUserId(userId) {
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new TypeError(t('theme.store.invalid_user_id'));
    }
  }

  return {
    async get(userId) {
      requireUserId(userId);
      const found = preferences.get(userId);
      if (!found) return null;
      return { scheme: found.scheme, updatedAt: found.updatedAt };
    },

    async set(userId, preference) {
      requireUserId(userId);
      if (!preference || typeof preference !== 'object') {
        throw new TypeError(t('theme.preference.invalid'));
      }
      const stored = Object.freeze({
        scheme: preference.scheme,
        updatedAt: preference.updatedAt,
      });
      preferences.set(userId, stored);
      return { scheme: stored.scheme, updatedAt: stored.updatedAt };
    },

    clear() {
      preferences.clear();
    },

    size() {
      return preferences.size;
    },
  };
}
