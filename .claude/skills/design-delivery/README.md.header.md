---
fileId: contextrail-template:.claude:skills:design-delivery:README
module: .claude/skills/design-delivery
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/design-delivery/SKILL.md
  - .claude/agents/designer.md
summary: Introduce the design-delivery skill folder and clarify when to use it for brandbook, design-system, mockup-prompt, and asset-handoff work.
owns: The folder-level entrypoint for the design-delivery skill.
boundaries: This file is a quick folder guide only. It must not duplicate the full design-delivery method.
invariants: The README stays short, repository-specific, and focused on when the skill should be used.
risks: Drift here can hide the design-lane skill or make it look broader than it is.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file first for quick orientation, then use SKILL.md for the actual design-lane method.
tests: node scripts/checks/design-docs-check.mjs
linkedDocs: .claude/CLAUDE.md
related: docs/design/README.md
---

# README.md
