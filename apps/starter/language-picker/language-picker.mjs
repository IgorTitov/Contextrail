/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Language Picker for the starter app.
 * @sidecar language-picker.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Language picker component.
 * Pure DOM creation — no framework dependency.
 * Reads current locale from preferences, switches locale on change, persists choice.
 */

import { t, setLocale, getLocale } from '../messages.mjs';
import { mergePreferences } from '../../../modules/user-preferences/public-api.mjs';
import { languagePicker } from './ui-selectors.mjs';

/** @type {string[]} */
const SUPPORTED_LOCALES = ['en', 'ru'];

/**
 * Create a language picker `<select>` element.
 *
 * @param {object} options
 * @param {import('../../../modules/user-preferences/public-api.mjs').StoragePort} [options.storage] Storage adapter for persisting preference.
 * @param {() => import('../../../modules/user-preferences/public-api.mjs').PreferencesState} [options.getPreferences] Current preferences getter.
 * @param {(state: import('../../../modules/user-preferences/public-api.mjs').PreferencesState) => void} [options.onLocaleChange] Called after locale changes.
 * @returns {HTMLSelectElement}
 */
export function createLanguagePicker({ storage, getPreferences, onLocaleChange } = {}) {
  const select = document.createElement('select');
  select.setAttribute('data-testid', languagePicker.select);
  select.setAttribute('aria-label', t('language-picker.label'));

  for (const locale of SUPPORTED_LOCALES) {
    const option = document.createElement('option');
    option.value = locale;
    option.textContent = t(`language-picker.${locale}`);
    if (locale === getLocale()) option.selected = true;
    select.appendChild(option);
  }

  select.addEventListener('change', () => {
    const newLocale = select.value;
    try {
      setLocale(newLocale);
    } catch {
      // locale not registered — register it lazily (should not happen in normal flow)
      return;
    }

    if (storage && getPreferences) {
      const updated = mergePreferences(getPreferences(), { locale: newLocale });
      storage.save(updated);
    }

    if (onLocaleChange) {
      onLocaleChange(getPreferences ? getPreferences() : { locale: newLocale, theme: 'system' });
    }
  });

  return select;
}
