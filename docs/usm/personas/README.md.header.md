---
fileId: contextrail-template:docs:usm:personas:README
module: docs/usm
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - docs/usm/index.md
  - docs/usm/personas/template.md
summary: Define the canonical storage location and authoring rules for persona definitions used by USM scenario maps.
owns: The folder-level guide to canonical persona definitions used by USM scenario maps.
boundaries: This folder stores reusable persona definitions only. It must not become a duplicate scenario or PRD area.
invariants: Persona files remain stable references for multiple scenarios and use one file per persona.
risks: Drift here can make persona ownership unclear or scatter persona definitions across unrelated docs.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Keep personas reusable across multiple workflows. Do not bury persona definitions inside scenario docs if they are meant to be shared.
tests: node scripts/checks/product-docs-check.mjs
linkedDocs:
  - docs/usm/index.md
  - docs/usm/scenarios/README.md
related: docs/usm/personas/template.md
---

# README.md
