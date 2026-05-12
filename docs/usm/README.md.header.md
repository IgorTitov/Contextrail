---
fileId: contextrail-template:docs:usm:README
module: docs/usm
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - docs/usm/index.md
  - docs/usm/personas/README.md
  - docs/usm/scenarios/README.md
  - docs/usm/templates/README.md
  - docs/usm/templates/story-map.md
summary: Explain the user-story-map documentation area and how persona-centered workflow and scenario artifacts are organized in this template.
owns: The folder-level guide to user-story-map documents in this template.
boundaries: This file guides the USM area only. It must not duplicate the full story-map index or template file contents.
invariants: The USM area remains focused on personas, workflows, scenario mapping, and structured links to requirements and backlog items.
risks: Drift here can blur the difference between story maps, requirements, and backlog execution artifacts.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file to explain what belongs in story-map space and how it connects requirements to execution.
tests: node scripts/checks/product-docs-check.mjs
linkedDocs:
  - docs/README.md
  - docs/usm/index.md
related:
  - docs/usm/templates/story-map.md
  - docs/usm/personas/README.md
  - docs/usm/scenarios/README.md
---

# README.md
