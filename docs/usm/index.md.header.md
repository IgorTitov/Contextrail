---
fileId: contextrail-template:docs:usm:index
module: docs/usm
stability: evolving
steward: shared
api: Index document
dependsOn:
  - docs/usm/templates/story-map.md
  - docs/usm/personas/README.md
  - docs/usm/scenarios/README.md
  - docs/prd/index.md
  - docs/backlog/index.md
summary: Index the user-story-map documents tracked in this template and explain how persona-centered workflow work is normalized from intake.
owns: The index of user-story-map documents tracked in this template.
boundaries: This file is the USM entry point, not the full product-discovery handbook.
invariants: The file remains the live USM index and keeps example trace blocks aligned with the template’s current structure.
risks: Drift here can leave starter scenarios stale or inconsistent with related requirement and backlog docs.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file as the USM entry point. Keep examples realistic enough to teach structure without pretending to be final product discovery output.
tests:
  - node scripts/checks/product-docs-check.mjs
  - tests/bdd/template-feature.test.mjs
linkedDocs:
  - docs/usm/README.md
  - docs/usm/templates/story-map.md
  - docs/usm/personas/README.md
  - docs/usm/scenarios/README.md
related:
  - docs/prd/index.md
  - docs/backlog/index.md
---

# index.md
