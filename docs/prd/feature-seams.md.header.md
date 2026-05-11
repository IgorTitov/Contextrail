---
fileId: contextrail-template:docs:prd:feature-seams
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/backlog/index.md
summary: Define the umbrella PRD for the Feature Seams hex module that provides a formal mechanism for Branch by Abstraction and Trunk-Based Development.
owns: The requirement intent for the Feature Seams hex module epic.
boundaries: This file owns requirement intent and acceptance boundaries for feature seams. It does not own execution status (backlog) or workflow decomposition (USM). USM is intentionally skipped because this is technical/architectural work.
invariants: Each deliverable is independently implementable as a backlog slice. Acceptance boundaries are testable. The module must not break existing starter features or hex boundaries.
risks: Drift here can decouple the feature seam requirements from the backlog slices that implement them, or allow the module to bypass hex architecture conventions.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: This is the umbrella PRD for the feature-seams hex module. This is technical/architectural work — no USM required. Individual backlog slices reference this document for requirement intent. Slice 5 items are TPL-037 through TPL-042.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/backlog/feature-seams.md
specRefs: TPL-036
related:
  - docs/prd/platform-seams.md
  - docs/prd/starter-common-features.md
  - docs/adr/0002-trunk-based-delivery.md
---

# feature-seams.md
