/* @HEADER
 * @version 0.6.5 | 2026-04-28
 * @purpose Header React component for the react-starter app.
 * @sidecar Header.jsx.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { selectors } from '../selectors.js';
import { ThemeToggle } from './ThemeToggle.jsx';

/**
 * App header with theme toggle and locale switch.
 */
export function Header({ t, theme, onThemeToggle, locale, onLocaleChange }) {
  return (
    <header data-testid={selectors.header}>
      <h1>{t('app.title')}</h1>

      <nav>
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />

        <select
          data-testid={selectors.localeSwitch}
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value)}
          aria-label={t('app.switchLocale')}
        >
          <option value="en">English</option>
          <option value="ru">Russian</option>
        </select>
      </nav>
    </header>
  );
}
