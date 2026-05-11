---
fileId: contextrail-template:apps:starter:notifications:ui-selectors
module: apps/starter
stability: evolving
steward: shared
api: file-local
summary: Bounded UI selector registry for the starter app.
owns: All stable data-testid, DOM id, and derived selectors for starter.
boundaries: Selector definitions only. No DOM manipulation or business logic.
invariants: Templates, JS, and tests must use selectors from this registry, not hardcoded strings.
notesForLLM: UI selector registry. Import selectors here instead of hardcoding data-testid values.
---

# ui-selectors.mjs
