---
fileId: contextrail-template:docs:prd:starter-common-features
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/usm/personas/template-user.md
  - docs/usm/index.md
  - docs/backlog/index.md
summary: Define the umbrella PRD for the 8 starter template common features covering preferences, i18n, theming, layout, navigation, notifications, loading states, and error handling.
owns: The requirement intent for the starter template common features epic.
boundaries: This file owns requirement intent and acceptance boundaries. It does not own workflow decomposition (USM) or execution status (backlog).
invariants: Each feature maps to an independently implementable backlog slice. Acceptance boundaries are testable.
risks: Drift here can decouple requirement intent from the USM workflows and backlog slices that depend on it.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: This is the umbrella PRD for all 8 starter common features. Individual backlog slices reference this document for requirement intent.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/usm/personas/template-user.md
  - docs/backlog/starter-common-features.md
specRefs: TPL-005
usmRefs:
  - TPL-006
  - TPL-007
  - TPL-008
  - TPL-009
  - TPL-010
  - TPL-011
  - TPL-012
  - TPL-013
related:
  - docs/usm/scenarios/template-user/preferences-workflow.md
  - docs/usm/scenarios/template-user/navigation-workflow.md
  - docs/usm/scenarios/template-user/feedback-workflow.md
---

# starter-common-features.md
