<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for starter/locales/.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# locales

Locale catalogs for the starter app i18n layer.

Each file exports a flat `Record<string, string>` keyed by dot-namespaced message keys. Register catalogs via `registerLocale()` from `../messages.mjs`.

## Files

- `en.mjs` — English (default)
- `ru.mjs` — Russian

## Rules

- Every key in one locale must exist in all locales (enforced by `tests/unit/locale-parity.test.mjs`).
- Placeholders (`{param}`) must match across locales.
- Add new keys to all locale files simultaneously.
