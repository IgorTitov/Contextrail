---
fileId: contextrail-template:docs:design:assets:README
module: docs/design/assets
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - docs/design/README.md
  - docs/design/design-system.md
summary: Explain how accepted design outputs and derived assets should be named, reviewed, and handed off in this template.
owns: The folder-level guide to accepted design outputs and implementation handoff handling.
boundaries: This file is an asset and handoff guide only. It must not duplicate product or design-system ownership.
invariants: Accepted outputs stay named, reviewable, and connected to their workflow and implementation targets.
risks: Drift here can make design outputs hard to trust or impossible to hand off cleanly to implementation.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file to explain how accepted design outputs become named, traceable, implementation-ready assets or references.
tests: node scripts/checks/design-docs-check.mjs
linkedDocs:
  - docs/design/README.md
  - docs/design/prompts/README.md
related:
  - docs/design/brandbook.md
  - docs/design/design-system.md
---

# README.md
