/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single cross-module entry point for the theme module.
 * @sidecar public-api.mjs.header.md
 * @layer public-api | @hex _none_ | @ctx theme
 * @public true
 * @edit careful
 */

// Domain
export {
  LIGHT,
  DARK,
  AUTO,
  isValidColorScheme,
  isValidSystemColorScheme,
  resolveColorScheme,
} from './domain/color-scheme.mjs';
export { createThemeTokens, renderCssVariables, escapeCssValue } from './domain/theme-tokens.mjs';
export { createThemePreference } from './domain/theme-preference.mjs';

// Ports
export { assertThemePreferenceStorePort } from './ports/theme-preference-store-port.mjs';

// Adapters
export { createMemoryThemePreferenceStore } from './adapters/memory-theme-preference-store.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
