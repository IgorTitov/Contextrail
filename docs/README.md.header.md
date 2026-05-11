---
fileId: contextrail-template:docs:README
module: docs
stability: evolving
steward: shared
api: Folder index
dependsOn:
  - docs/prd/README.md
  - docs/usm/README.md
  - docs/backlog/README.md
  - docs/design/README.md
  - docs/adr/README.md
summary: Top-level map of the product, design, and engineering documentation families used by this template.
owns: The top-level map of documentation families used by the template.
boundaries: This file is a docs index only. It must not duplicate the detailed schemas or templates stored in subfolders.
invariants: The listed documentation areas stay aligned with the actual folder structure and remain easy to scan.
risks: Drift here makes the docs tree harder to navigate and hides where canonical artifacts should live.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file as the map to the docs tree. Keep it short, navigational, and accurate.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/design-docs-check.mjs
linkedDocs:
  - README.md
  - .claude/CLAUDE.md
related:
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
  - docs/design/README.md
  - docs/adr/README.md
---

# README.md
