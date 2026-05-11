<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for starter/theme-toggle/.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# theme-toggle

Theme toggle component and CSS custom properties for light/dark/system themes.

## Files

- `theme-variables.css` — CSS custom properties for light and dark themes
- `theme-toggle.mjs` — Toggle button component + `resolveTheme()` / `applyTheme()` helpers
- `ui-selectors.mjs` — Bounded selector registry

## How it works

- Light theme is the default (`--color-*` variables on `:root`)
- Dark theme activates via `data-theme="dark"` attribute on `<html>`
- System preference via `prefers-color-scheme` media query fallback
- User choice persists via the user-preferences module
