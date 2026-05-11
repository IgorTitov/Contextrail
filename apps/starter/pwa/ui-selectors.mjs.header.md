---
fileId: contextrail-template:apps:starter:pwa:ui-selectors
module: apps/starter
stability: evolving
steward: shared
api: "{ pwa }"
owns: The stable data-testid values for PWA UI elements (install button, update banner, offline indicator).
boundaries: Only stable automation hooks (data-testid). No CSS classes or application logic. Must not grow into a global cross-feature selector table.
invariants: Every exported value must match a real data-testid used by PWA UI and asserted in tests.
risks: Renaming a testid here without updating the corresponding template and test causes silent selector drift.
securityPrivacy: Static constants only.
notesForLLM: This is the PWA-scoped selector registry, separate from the bootstrap feature's ui-selectors.mjs. Keep this file narrowly scoped to the PWA slice only.
tests: _none_ (selectors will be tested by future e2e specs)
linkedDocs:
  - apps/starter/pwa/README.md
  - docs/design/design-system.md
specRefs: TPL-028
related:
  - apps/starter/ui-selectors.mjs
  - docs/design/design-system.md
summary: Bounded UI selector registry for the starter app.
---

# ui-selectors.mjs
