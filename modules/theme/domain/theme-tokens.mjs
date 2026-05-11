/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure theme-token value object + CSS custom-property renderer with defensive escaping.
 * @sidecar theme-tokens.mjs.header.md
 * @layer domain | @hex _none_ | @ctx theme
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';
import { LIGHT, DARK } from './color-scheme.mjs';

/**
 * Pure theme-tokens value object. A `ThemeTokens` declares the same set of
 * kebab-case token keys for both the light and dark schemes, mapping each
 * key to a plain CSS value string. No color type, no gradient parser —
 * values stay opaque strings so the domain is pure and framework-free.
 * `renderCssVariables` emits a `:root { --token: value; ... }` CSS block
 * with every value defensively escaped so a user-supplied palette cannot
 * break out of the declaration and inject arbitrary CSS.
 *
 * @typedef {Record<string, string>} ThemeTokenMap
 *
 * @typedef {object} ThemeTokens
 * @property {ThemeTokenMap} light
 * @property {ThemeTokenMap} dark
 */

const KEBAB_CASE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Validate and construct a frozen {@link ThemeTokens}. Both schemes must
 * declare the same set of keys so that switching scheme at runtime never
 * leaves any variable undefined.
 *
 * @param {{ light: ThemeTokenMap, dark: ThemeTokenMap }} input
 * @returns {Readonly<ThemeTokens>}
 */
export function createThemeTokens(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('theme.tokens.invalid'));
  }
  const { light, dark } = input;
  const validatedLight = validateMap(light, 'light');
  const validatedDark = validateMap(dark, 'dark');

  const lightKeys = Object.keys(validatedLight).sort();
  const darkKeys = Object.keys(validatedDark).sort();
  if (
    lightKeys.length !== darkKeys.length ||
    lightKeys.some((key, index) => key !== darkKeys[index])
  ) {
    throw new TypeError(t('theme.tokens.mismatched_keys'));
  }

  return Object.freeze({
    light: Object.freeze({ ...validatedLight }),
    dark: Object.freeze({ ...validatedDark }),
  });
}

/**
 * @param {unknown} raw
 * @param {'light'|'dark'} schemeName
 * @returns {ThemeTokenMap}
 */
function validateMap(raw, schemeName) {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError(
      t(schemeName === 'light' ? 'theme.tokens.invalid_light' : 'theme.tokens.invalid_dark'),
    );
  }
  /** @type {ThemeTokenMap} */
  const out = {};
  for (const [key, value] of Object.entries(/** @type {Record<string, unknown>} */ (raw))) {
    if (typeof key !== 'string' || !KEBAB_CASE.test(key)) {
      throw new TypeError(t('theme.tokens.invalid_key', { key }));
    }
    if (typeof value !== 'string' || value.length === 0) {
      throw new TypeError(t('theme.tokens.invalid_value', { key }));
    }
    out[key] = value;
  }
  return out;
}

/**
 * Render a CSS custom-property declaration block for the requested scheme.
 * Values are defensively escaped — the five characters `{` `}` `;` `<` `\`
 * are stripped so a crafted palette entry cannot close the `:root` block
 * and inject a new rule.
 *
 * @param {ThemeTokens} tokens
 * @param {'light'|'dark'} scheme
 * @returns {string}
 */
export function renderCssVariables(tokens, scheme) {
  if (scheme !== LIGHT && scheme !== DARK) {
    throw new TypeError(t('theme.tokens.unknown_scheme'));
  }
  const map = scheme === LIGHT ? tokens.light : tokens.dark;
  const lines = Object.keys(map)
    .sort()
    .map((key) => `  --${key}: ${escapeCssValue(map[key])};`);
  return `:root {\n${lines.join('\n')}\n}\n`;
}

/**
 * Defensively escape a CSS value. Strips `{`, `}`, `;`, `<`, `\` — any of
 * which could break out of the declaration block. Leaves whitespace and
 * normal color/length syntax intact.
 *
 * @param {string} value
 * @returns {string}
 */
export function escapeCssValue(value) {
  return value.replace(/[{};<\\]/g, '');
}
