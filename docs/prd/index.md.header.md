---
fileId: contextrail-template:docs:prd:index
module: docs/prd
stability: evolving
steward: shared
api: Index document
dependsOn:
  - docs/prd/templates/work-item.md
  - docs/usm/index.md
  - docs/backlog/index.md
summary: Index the product requirement documents tracked in this template and explain how PRD work is normalized from intake.
owns: The index of product requirement documents tracked in this template.
boundaries: This file is the PRD entry point, not the full product strategy handbook.
invariants: The file remains the live PRD index and keeps example trace blocks aligned with the template’s current structure.
risks: Drift here can leave starter requirement examples stale or inconsistent with downstream planning docs.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file as the PRD entry point. Keep examples realistic enough to teach the structure without pretending to be final product content.
tests:
  - node scripts/checks/product-docs-check.mjs
  - tests/bdd/template-feature.test.mjs
linkedDocs:
  - docs/prd/README.md
  - docs/prd/templates/work-item.md
related:
  - docs/usm/index.md
  - docs/backlog/index.md
---

# index.md
