<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for theme/adapters.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/theme/adapters/

Adapters that implement `ThemePreferenceStorePort`. Ships a zero-dependency in-memory Map-backed store used by tests and the api-starter demo. Real deployments plug a localStorage, cookie, or database adapter behind the same port.
