---
fileId: contextrail-template:docs:backlog:index
module: docs/backlog
stability: evolving
steward: shared
api: Index document
dependsOn:
  - docs/backlog/templates/intake-item.md
  - docs/backlog/templates/work-item.md
  - docs/usm/index.md
  - docs/prd/index.md
summary: Index the current backlog intake items and actionable execution slices tracked in this template.
owns: The index of backlog intake items and actionable work tracked in this template.
boundaries: This file is the backlog entry point, not the full planning process handbook.
invariants: The file remains the live index for backlog work items and keeps trace blocks aligned with the current examples.
risks: Drift here can make example work items stale or break the relationship between backlog indexing and traceability.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file as the working backlog index. Keep examples realistic and aligned with the template’s traceability model.
tests:
  - node scripts/checks/product-docs-check.mjs
  - tests/bdd/template-feature.test.mjs
linkedDocs:
  - docs/backlog/README.md
  - docs/backlog/templates/intake-item.md
  - docs/backlog/templates/work-item.md
related:
  - docs/prd/index.md
  - docs/usm/index.md
---

# index.md
