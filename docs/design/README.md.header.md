---
fileId: contextrail-template:docs:design:README
module: docs/design
stability: evolving
steward: shared
api: Folder index
dependsOn:
  - docs/design/brandbook.md
  - docs/design/design-system.md
  - docs/design/prompts/README.md
  - docs/design/assets/README.md
summary: Top-level map of the design documentation family used by this template for brandbook, design-system, prompt assets, and implementation handoff.
owns: The top-level map of the design documentation family used by this template.
boundaries: This file is a design-docs index only. It must not duplicate the detailed design-system, brandbook, prompt, or asset guidance from the owned subfiles.
invariants: The design docs stay tied to user-facing work, brandbook, prompt artifacts, and implementation handoff instead of becoming a second PRD or backlog layer.
risks: Drift here makes the design lane hard to discover or blurs its relationship to product and frontend execution.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file as the map to the design docs tree. Keep it short, navigational, and accurate.
tests: node scripts/checks/design-docs-check.mjs
linkedDocs:
  - docs/README.md
  - .claude/agents/designer.md
related:
  - docs/design/brandbook.md
  - docs/design/design-system.md
  - docs/design/prompts/README.md
  - docs/design/assets/README.md
---

# README.md
