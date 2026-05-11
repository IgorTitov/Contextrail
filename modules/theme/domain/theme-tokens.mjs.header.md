---
fileId: contextrail-template:modules:theme:domain:theme-tokens
module: modules/theme
stability: experimental
steward: theme-module
api: Domain
boundedContext: theme
summary: Pure theme-token value object with kebab-case validation, mismatched-key detection, and defensive CSS custom-property rendering.
owns: createThemeTokens, renderCssVariables, escapeCssValue.
boundaries: Pure — emits plain strings. No DOM, no stylesheet injection.
invariants: light and dark must declare the same key set. Values are defensively escaped (strips { } ; < \) before rendering.
specRefs:
  - TPL-001
---

# theme-tokens.mjs
