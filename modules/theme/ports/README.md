<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for theme/ports.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/theme/ports/

Port contracts for the theme module. Declares `ThemePreferenceStorePort` so adapters can persist theme preferences in localStorage, cookies, a database row, or any other backend without leaking storage concerns into the pure domain.
