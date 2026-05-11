---
fileId: contextrail-template:docs:product-data:README
module: docs/product-data
stability: evolving
steward: shared
api: Folder guide
dependsOn: docs/usm/personas/README.md
summary: Explain the product-data area and the UI consumption contract for persona economics and other commercial metadata.
owns: The folder-level guide to product-data artifacts in this template.
boundaries: This folder stores commercial and adoption metadata only. It must not duplicate USM or PRD content.
invariants: Economics files remain structured, optional per-persona, and repository-local.
risks: Drift here can let frontend surfaces hardcode commercial data instead of reading from the canonical source.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: This area provides structured commercial metadata for tool and UI consumption. It is separate from USM and PRD by design.
tests: node scripts/checks/product-data-check.mjs
linkedDocs:
  - docs/usm/personas/README.md
  - docs/product-data/persona-economics/README.md
related:
  - docs/usm/index.md
  - docs/prd/index.md
---

# README.md
