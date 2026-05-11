---
fileId: contextrail-template:.claude:skills:acceptance-validation:README
module: .claude/skills/acceptance-validation
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/acceptance-validation/SKILL.md
  - .claude/agents/acceptance-tester.md
summary: Introduce the acceptance-validation skill folder and clarify when to use it for acceptance closure on implemented slices.
owns: The folder-level entrypoint for the acceptance-validation skill.
boundaries: This file is a quick folder guide only. It must not duplicate the full acceptance method.
invariants: The README stays short, repository-specific, and focused on when the skill should be used.
risks: Drift here can hide the skill or make it look broader than it is.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file first for quick orientation, then use SKILL.md for the full method.
tests: node scripts/checks/delivery-flow-check.mjs
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/feature-delivery/README.md
  - .claude/skills/bdd-playwright/README.md
---

# README.md
