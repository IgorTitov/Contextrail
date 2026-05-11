---
fileId: contextrail-template:docs:prd:bootstrap-template
module: docs/prd
stability: evolving
steward: shared
api: Starter PRD document
dependsOn:
  - docs/prd/index.md
  - docs/usm/scenarios/maintainer/bootstrap-workflow.md
  - docs/backlog/index.md
summary: Provide a starter real PRD example so the template demonstrates requirement intent linked to backlog and USM.
owns: One real starter PRD example for the template bootstrap workflow.
boundaries: This file is an example PRD, not a reusable template.
invariants: The example stays aligned with the bootstrap USM and backlog starter items.
risks: Drift here weakens the starter example for requirement-intent-first planning.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: This is a starter PRD example. Replace or extend it with real requirement documents in a live project.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/usm/scenarios/maintainer/bootstrap-workflow.md
  - docs/backlog/index.md
specRefs: TPL-001
usmRefs: TPL-002
related: tests/bdd/features/template.feature
---

# bootstrap-template.md
