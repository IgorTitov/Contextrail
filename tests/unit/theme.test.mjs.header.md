---
fileId: contextrail-template:tests:unit:theme
module: tests/unit
stability: experimental
steward: theme-module
api: Tests
boundedContext: theme
summary: Unit proof for the theme module — color scheme, tokens, preference, port, memory adapter.
owns: Unit coverage of the theme domain, port assertion, and in-memory adapter.
boundaries: Tests import only from modules/theme/public-api.mjs. No deep imports.
invariants: Tests must fail when any listed behavior regresses.
specRefs:
  - TPL-001
---

# theme.test.mjs
