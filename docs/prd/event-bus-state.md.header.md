---
fileId: contextrail-template:docs:prd:event-bus-state
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/backlog/index.md
summary: Define the umbrella PRD for the Event Bus and State Management hex modules that provide typed in-process eventing and observable state stores.
owns: The requirement intent for the Event Bus and State Management hex modules epic.
boundaries: This file owns requirement intent and acceptance boundaries for event-bus and state modules. It does not own execution status (backlog) or workflow decomposition (USM). USM is intentionally skipped because this is technical/architectural work.
invariants: Each deliverable is independently implementable as a backlog slice. Acceptance boundaries are testable. The modules must not break existing starter features or hex boundaries.
risks: Drift here can decouple the event-bus and state requirements from the backlog slices that implement them, or allow the modules to bypass hex architecture conventions.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: This is the umbrella PRD for the event-bus and state hex modules. This is technical/architectural work -- no USM required. Individual backlog slices reference this document for requirement intent. Slice 6 items are TPL-044 through TPL-053.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/backlog/event-bus-state.md
specRefs: TPL-043
related:
  - docs/prd/feature-seams.md
  - docs/prd/platform-seams.md
  - docs/prd/starter-common-features.md
---

# event-bus-state.md
