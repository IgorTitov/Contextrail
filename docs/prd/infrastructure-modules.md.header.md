---
fileId: contextrail-template:docs:prd:infrastructure-modules
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/backlog/index.md
summary: Define the umbrella PRD for nine new hex infrastructure modules covering logging, caching, form validation, realtime communication, background tasks, permissions, file handling, analytics, and scheduling.
owns: The requirement intent for the nine infrastructure hex modules epic.
boundaries: This file owns requirement intent and acceptance boundaries for log, cache, form-validation, realtime, task, permission, file, analytics, and scheduler modules. It does not own execution status (backlog) or workflow decomposition (USM). USM is intentionally skipped because this is technical/architectural work.
invariants: Each deliverable is independently implementable as a backlog slice. Acceptance boundaries are testable. The modules must not break existing starter features or hex boundaries.
risks: Drift here can decouple requirements from the backlog slices that implement them, or allow modules to bypass hex architecture conventions.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials. Analytics module must respect do-not-track and consent management. Permission module handles authorization rules only -- not authentication.
notesForLLM: This is the umbrella PRD for 9 infrastructure hex modules. This is technical/architectural work -- no USM required. Individual backlog slices reference this document for requirement intent. Slices 19-27, items TPL-137 through TPL-171. All user-facing error messages must go through the i18n layer. No external dependencies unless explicitly noted. All modules are framework-free and testable in isolation.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/backlog/infrastructure-modules.md
specRefs: TPL-136
related:
  - docs/prd/auth-api-client.md
  - docs/prd/event-bus-state.md
  - docs/prd/feature-seams.md
---

# infrastructure-modules.md
