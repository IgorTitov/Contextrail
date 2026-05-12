---
fileId: contextrail-template:docs:backlog:README
module: docs/backlog
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - docs/backlog/index.md
  - docs/backlog/templates/README.md
  - docs/backlog/templates/intake-item.md
  - docs/backlog/templates/work-item.md
summary: Explain the backlog documentation area and how intake and actionable work items are organized in this template.
owns: The folder-level guide to backlog intake and actionable work tracking.
boundaries: This file guides backlog usage only. It must not duplicate all backlog entries or become a second planning index.
invariants: The backlog area stays focused on intake, actionable work items, their priority and status, and how they connect to templates and traceability.
risks: Drift here can make the backlog area harder to use consistently or disconnect templates from live work items.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file to explain what belongs in the backlog area and how it connects to the rest of the docs stack.
tests: node scripts/checks/product-docs-check.mjs
linkedDocs:
  - docs/README.md
  - docs/backlog/index.md
related:
  - docs/backlog/templates/intake-item.md
  - docs/backlog/templates/work-item.md
---

# README.md
