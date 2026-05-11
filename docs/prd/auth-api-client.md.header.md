---
fileId: contextrail-template:docs:prd:auth-api-client
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/backlog/index.md
summary: Define the umbrella PRD for the Auth and API Client hex modules that provide authentication ports with multiple adapters and a typed HTTP client abstraction.
owns: The requirement intent for the Auth and API Client hex modules epic.
boundaries: This file owns requirement intent and acceptance boundaries for auth and api-client modules. It does not own execution status (backlog) or workflow decomposition (USM). USM is intentionally skipped because this is technical/architectural work.
invariants: Each deliverable is independently implementable as a backlog slice. Acceptance boundaries are testable. The modules must not break existing starter features or hex boundaries.
risks: Drift here can decouple the auth and api-client requirements from the backlog slices that implement them, or allow the modules to bypass hex architecture conventions.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials. Auth adapters in this slice are demo/stub only -- do not store real credentials or tokens in production without proper security review.
notesForLLM: This is the umbrella PRD for the auth and api-client hex modules. This is technical/architectural work -- no USM required. Individual backlog slices reference this document for requirement intent. Slice 8 items are TPL-063 through TPL-070. All user-facing error messages must go through the i18n layer.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/backlog/auth-api-client.md
specRefs: TPL-062
related:
  - docs/prd/event-bus-state.md
  - docs/prd/feature-seams.md
  - docs/prd/platform-seams.md
---

# auth-api-client.md
