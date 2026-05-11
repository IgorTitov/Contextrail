/* @HEADER
 * @version 0.6.5 | 2026-04-28
 * @purpose ThemeToggle React component for the react-starter app.
 * @sidecar ThemeToggle.jsx.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { selectors } from '../selectors.js';

/**
 * Theme toggle button.
 * Preferences come from the hex user-preferences module via React adapter.
 */
export function ThemeToggle({ theme, onToggle }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      data-testid={selectors.themeToggle}
      onClick={() => onToggle(nextTheme)}
      aria-label={`Switch to ${nextTheme} theme`}
    >
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
