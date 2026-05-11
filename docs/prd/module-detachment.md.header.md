---
fileId: contextrail-template:docs:prd:module-detachment
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/backlog/index.md
summary: Define the umbrella PRD for module detachment tooling and the JS+JSDoc ADR that documents the template's language-strategy decision.
owns: The requirement intent for the module detachment tooling and TS-vs-JS ADR (Slice 18).
boundaries: This file owns requirement intent and acceptance boundaries for detachment tooling and the language-strategy ADR. It does not own execution status (backlog) or workflow decomposition (USM). USM is intentionally skipped because this is technical/architectural infrastructure and developer workflow tooling.
invariants: Each deliverable is independently implementable as a backlog slice. Acceptance boundaries are testable. The detach script must not silently break dependents. The ADR must document arguments for both sides.
risks: Drift here can decouple the detachment requirements from the backlog slices, or allow the detach script to silently remove modules that other modules depend on.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: This PRD covers two related but distinct concerns in Slice 18. The module detachment epic (TPL-129) provides tooling for safely removing hex modules from template instances. The TS-vs-JS ADR (TPL-134) documents the template's language strategy. Both are technical/architectural -- no USM required. The detach script uses the module dependency manifest to prevent silent cascade breaks. The ADR is a documentation artifact, not a code change.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/backlog/module-detachment.md
specRefs:
  - TPL-129
  - TPL-134
related:
  - docs/prd/tree-shaking.md
  - docs/prd/platform-seams.md
---

# module-detachment.md
