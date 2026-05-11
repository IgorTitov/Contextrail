---
fileId: contextrail-template:apps:api-starter:routes:theme
module: apps/api-starter
stability: experimental
steward: api-starter
api: Route
boundedContext: theme
summary: Theme demo routes — render CSS custom properties and persist user theme preferences via the theme module.
owns: /api/theme/tokens, /api/theme/preference, /api/theme/preference/set handlers.
boundaries: Imports only from modules/theme/public-api.mjs. No deep imports.
invariants: Every CSS value is rendered through renderCssVariables so injection attempts are defensively escaped.
specRefs:
  - TPL-001
---

# theme.mjs
