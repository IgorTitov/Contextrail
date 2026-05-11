---
fileId: contextrail-template:modules:theme:public-api
module: modules/theme
stability: experimental
steward: theme-module
api: PublicAPI
boundedContext: theme
summary: Single cross-module entry point for the theme module — re-exports domain, port, adapters, messages.
owns: The public surface of the theme module.
boundaries: The only file other modules may import from theme/. Deep imports are forbidden.
invariants: Every export here must be intentionally public. Internal helpers must not leak.
specRefs:
  - TPL-001
exports:
  - assertThemePreferenceStorePort
  - AUTO
  - createMemoryThemePreferenceStore
  - createThemePreference
  - createThemeTokens
  - DARK
  - escapeCssValue
  - getLocale
  - isValidColorScheme
  - isValidSystemColorScheme
  - LIGHT
  - registerLocale
  - renderCssVariables
  - resetLocale
  - resolveColorScheme
  - setLocale
  - t
---

# public-api.mjs
