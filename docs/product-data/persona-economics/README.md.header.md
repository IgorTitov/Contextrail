---
fileId: contextrail-template:docs:product-data:persona-economics:README
module: docs/product-data/persona-economics
stability: evolving
steward: shared
api: Folder guide
dependsOn: docs/product-data/README.md
summary: Explain the persona-economics subfolder and the structured data contract for per-persona economics files.
owns: The folder-level guide to per-persona economics files.
boundaries: This folder stores per-persona economics data only. It must not become a second persona definition area.
invariants: One file per persona, named by persona key, using the persona-economics JSON block format.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Each file here is keyed to a persona under docs/usm/personas/. The economics-template.md is the starting point for new files.
tests: node scripts/checks/product-data-check.mjs
linkedDocs:
  - docs/product-data/README.md
  - docs/usm/personas/README.md
related: docs/product-data/persona-economics/economics-template.md
---

# README.md
