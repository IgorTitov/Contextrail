---
fileId: contextrail-template:modules:theme:domain:theme-preference
module: modules/theme
stability: experimental
steward: theme-module
api: Domain
boundedContext: theme
summary: Pure immutable ThemePreference record (scheme + updatedAt) with validation.
owns: createThemePreference.
boundaries: Pure value object. No storage, no clock — callers supply updatedAt.
invariants: Returned record is frozen. updatedAt must be a non-negative integer (epoch ms).
specRefs:
  - TPL-001
---

# theme-preference.mjs
