---
fileId: contextrail-template:docs:prd:README
module: docs/prd
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - docs/prd/index.md
  - docs/prd/templates/README.md
  - docs/prd/templates/work-item.md
summary: Explain the PRD documentation area and how product requirement documents are organized in this template.
owns: The folder-level guide to product requirement documents in this template.
boundaries: This file guides the PRD area only. It must not duplicate the full PRD index or template file contents.
invariants: The PRD area remains focused on requirement intent, scope, business rules, constraints, and links to downstream planning artifacts.
risks: Drift here can blur the difference between requirement capture and backlog or story-map work.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file to explain what belongs in PRD space and how it connects to the rest of the template docs.
tests: node scripts/checks/product-docs-check.mjs
linkedDocs:
  - docs/README.md
  - docs/prd/index.md
related: docs/prd/templates/work-item.md
---

# README.md
