/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Preferences domain logic for the user-preferences module.
 * @sidecar preferences.mjs.header.md
 * @layer module | @hex domain | @ctx user-preferences
 * @public false
 * @edit careful
 */

/**
 * Pure domain logic for user preferences.
 * Framework-free, no external dependencies.
 */

/** @typedef {{ locale: string, theme: 'light' | 'dark' | 'system' }} PreferencesState */

const VALID_THEMES = ['light', 'dark', 'system'];
const DEFAULT_LOCALE = 'en';
const DEFAULT_THEME = 'system';

/**
 * Return the default preferences state.
 * @returns {PreferencesState}
 */
export function defaultPreferences() {
  return { locale: DEFAULT_LOCALE, theme: DEFAULT_THEME };
}

/**
 * Merge a partial update into existing preferences, validating values.
 * Unknown keys are silently dropped. Invalid theme values are ignored.
 *
 * @param {PreferencesState} current
 * @param {Partial<PreferencesState>} partial
 * @returns {PreferencesState}
 */
export function mergePreferences(current, partial) {
  const next = { ...current };
  if (partial.locale != null && typeof partial.locale === 'string' && partial.locale.length > 0) {
    next.locale = partial.locale;
  }
  if (partial.theme != null && VALID_THEMES.includes(partial.theme)) {
    next.theme = partial.theme;
  }
  return next;
}

/**
 * Check whether a value looks like a valid PreferencesState.
 * @param {unknown} value
 * @returns {value is PreferencesState}
 */
export function isValidPreferences(value) {
  if (!value || typeof value !== 'object') return false;
  const v = /** @type {Record<string,unknown>} */ (value);
  return (
    typeof v.locale === 'string' &&
    v.locale.length > 0 &&
    VALID_THEMES.includes(/** @type {string} */ (v.theme))
  );
}
