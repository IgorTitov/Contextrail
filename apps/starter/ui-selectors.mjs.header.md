---
fileId: contextrail-template:apps:starter:ui-selectors
module: apps/starter
stability: evolving
steward: shared
api: "{ bootstrap }"
owns: The bounded selector registry for the template's bootstrap starter feature.
boundaries: This file exports stable automation-facing hooks only. Do not add presentational CSS classes or application logic.
invariants: Every exported value must match a real data-testid or DOM id used in the corresponding HTML and asserted in tests.
risks: If this module drifts from the HTML fixture, E2E tests will fail — that is the intended safety net.
securityPrivacy: Static constants only; no secrets or network access.
notesForLLM: This is the concrete example of the bounded selector-registry pattern. Keep it small and import it from both product code and tests.
tests:
  - tests/unit/ui-selectors.test.mjs
  - tests/e2e/template-bootstrap.spec.mjs
linkedDocs:
  - docs/design/design-system.md
  - apps/starter/README.md
related:
  - tests/e2e/template-bootstrap.html
  - tests/e2e/template-bootstrap.spec.mjs
summary: Bounded UI selector registry for the starter app.
---

# ui-selectors.mjs
