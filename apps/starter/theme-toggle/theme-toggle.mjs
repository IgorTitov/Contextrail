/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Theme Toggle for the starter app.
 * @sidecar theme-toggle.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Theme toggle component.
 * Applies data-theme attribute on <html>, reads from preferences, persists choice.
 */

import { t } from '../messages.mjs';
import { mergePreferences } from '../../../modules/user-preferences/public-api.mjs';
import { themeToggle } from './ui-selectors.mjs';

const THEMES = ['light', 'dark', 'system'];

/**
 * Resolve the effective theme (light or dark) from user preference.
 * 'system' defers to prefers-color-scheme.
 *
 * @param {'light' | 'dark' | 'system'} preference
 * @param {MediaQueryList} [mediaQuery] — injectable for testing
 * @returns {'light' | 'dark'}
 */
export function resolveTheme(preference, mediaQuery) {
  if (preference === 'light' || preference === 'dark') return preference;
  const mq =
    mediaQuery ??
    (typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null);
  return mq?.matches ? 'dark' : 'light';
}

/**
 * Apply a theme to the document root.
 *
 * @param {'light' | 'dark' | 'system'} theme
 * @param {HTMLElement} [root]
 */
export function applyTheme(theme, root) {
  const el = root ?? document.documentElement;
  if (theme === 'system') {
    el.removeAttribute('data-theme');
  } else {
    el.setAttribute('data-theme', theme);
  }
}

/**
 * Create a theme toggle button that cycles through light → dark → system.
 *
 * @param {object} options
 * @param {import('../../../modules/user-preferences/public-api.mjs').StoragePort} [options.storage]
 * @param {() => import('../../../modules/user-preferences/public-api.mjs').PreferencesState} [options.getPreferences]
 * @param {(state: import('../../../modules/user-preferences/public-api.mjs').PreferencesState) => void} [options.onThemeChange]
 * @returns {HTMLButtonElement}
 */
export function createThemeToggle({ storage, getPreferences, onThemeChange } = {}) {
  const button = document.createElement('button');
  button.setAttribute('data-testid', themeToggle.button);
  button.setAttribute('type', 'button');

  let currentIndex = 0;

  function updateLabel() {
    const theme = THEMES[currentIndex];
    button.textContent = t(`theme-toggle.${theme}`);
    button.setAttribute('aria-label', `${t('theme-toggle.label')}: ${t(`theme-toggle.${theme}`)}`);
  }

  // Initialize from preferences
  if (getPreferences) {
    const prefs = getPreferences();
    const idx = THEMES.indexOf(prefs.theme);
    if (idx >= 0) currentIndex = idx;
    applyTheme(prefs.theme);
  }

  updateLabel();

  button.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % THEMES.length;
    const newTheme = /** @type {'light' | 'dark' | 'system'} */ (THEMES[currentIndex]);

    applyTheme(newTheme);
    updateLabel();

    if (storage && getPreferences) {
      const updated = mergePreferences(getPreferences(), { theme: newTheme });
      storage.save(updated);
    }

    if (onThemeChange) {
      onThemeChange(getPreferences ? getPreferences() : { locale: 'en', theme: newTheme });
    }
  });

  return button;
}
