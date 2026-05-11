---
fileId: contextrail-template:modules:theme:domain:color-scheme
module: modules/theme
stability: experimental
steward: theme-module
api: Domain
boundedContext: theme
summary: Pure color-scheme enum + validator + preference-vs-system resolver.
owns: LIGHT/DARK/AUTO constants, isValidColorScheme, isValidSystemColorScheme, resolveColorScheme.
boundaries: Pure — no DOM, no matchMedia, no storage. Callers pass the observed system preference in.
invariants: AUTO must never leak as an effective scheme from resolveColorScheme — it always collapses to light or dark.
specRefs:
  - TPL-001
---

# color-scheme.mjs
