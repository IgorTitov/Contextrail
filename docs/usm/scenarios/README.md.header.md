---
fileId: contextrail-template:docs:usm:scenarios:README
module: docs/usm
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - docs/usm/index.md
  - docs/usm/templates/story-map.md
  - docs/usm/personas/README.md
summary: Define the canonical storage layout and authoring rules for persona-centered workflow scenario maps used by the USM layer.
owns: The folder-level guide to persona-centered workflow scenario maps used by the USM layer.
boundaries: This folder stores workflow maps only. It must not become a duplicate persona or PRD area.
invariants: Each significant workflow gets its own USM scenario map and references a persona.
risks: Drift here can push unrelated workflows into oversized maps or scatter workflow definitions across the repo.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Create one workflow map per significant scenario. Do not force multiple unrelated workflows into one giant map.
tests: node scripts/checks/product-docs-check.mjs
linkedDocs:
  - docs/usm/index.md
  - docs/usm/templates/story-map.md
  - docs/usm/personas/README.md
related: docs/usm/templates/story-map.md
---

# README.md
