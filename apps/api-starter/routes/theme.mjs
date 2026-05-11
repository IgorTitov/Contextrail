/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Theme demo routes — render CSS custom properties and persist user theme preferences via the theme module.
 * @sidecar theme.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-001
/**
 * Theme demo routes — exercise the theme module's public API from a host
 * server. The CSS variable block is rendered on demand from a pure token
 * palette, the preference store is backed by an in-memory adapter. Real
 * deployments swap the adapter for a localStorage, cookie, or database
 * publisher behind the same `ThemePreferenceStorePort` without touching
 * these routes.
 *
 * GET /api/theme/tokens?scheme=dark           → { scheme, css } with rendered CSS variables
 * GET /api/theme/preference?user=alice        → stored preference or { stored: false }
 * GET /api/theme/preference/set?user=alice&scheme=dark
 *                                             → persists and returns the new preference
 */

import {
  DARK,
  LIGHT,
  AUTO,
  isValidColorScheme,
  resolveColorScheme,
  createThemeTokens,
  renderCssVariables,
  createThemePreference,
} from '../../../modules/theme/public-api.mjs';

const DEMO_TOKENS = createThemeTokens({
  light: {
    'color-bg': '#ffffff',
    'color-fg': '#111111',
    'color-accent': '#0f172a',
    'color-muted': '#f1f5f9',
  },
  dark: {
    'color-bg': '#0b1220',
    'color-fg': '#f5f5f5',
    'color-accent': '#38bdf8',
    'color-muted': '#1e293b',
  },
});

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} _ctx
 */
export async function themeTokensHandler(req, _ctx) {
  const requested = req.query.get('scheme') ?? LIGHT;
  // Collapse AUTO against a fake system preference so the demo always
  // returns renderable CSS.
  const scheme = isValidColorScheme(requested)
    ? requested === AUTO
      ? resolveColorScheme(AUTO, LIGHT)
      : requested
    : LIGHT;
  const css = renderCssVariables(DEMO_TOKENS, /** @type {'light'|'dark'} */ (scheme));
  return { scheme, css };
}

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export async function themePreferenceGetHandler(req, ctx) {
  const user = req.query.get('user');
  if (!user) {
    return { error: 'Missing "user" query parameter' };
  }
  const pref = await ctx.themeStore.get(user);
  if (!pref) return { user, stored: false };
  return { user, stored: true, preference: pref };
}

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export async function themePreferenceSetHandler(req, ctx) {
  const user = req.query.get('user');
  const scheme = req.query.get('scheme');
  if (!user) {
    return { error: 'Missing "user" query parameter' };
  }
  if (!isValidColorScheme(scheme)) {
    return { error: 'Invalid "scheme" query parameter (expected light, dark, or auto)' };
  }
  const preference = createThemePreference({
    scheme,
    updatedAt: Date.now(),
  });
  const written = await ctx.themeStore.set(user, preference);
  return { user, stored: true, preference: written };
}

// Re-export demo constants so tests can assert the starter palette.
export { DEMO_TOKENS, DARK, LIGHT, AUTO };
