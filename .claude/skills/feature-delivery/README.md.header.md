---
fileId: contextrail-template:.claude:skills:feature-delivery:README
module: .claude/skills/feature-delivery
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/feature-delivery/SKILL.md
  - .claude/agents/feature-implementer.md
summary: Introduce the feature-delivery skill folder and clarify when to use it for bounded implementation work.
owns: The folder-level entrypoint for the feature-delivery skill.
boundaries: This file is a quick folder guide only. It must not duplicate the full implementation method.
invariants: The README stays short, repository-specific, and focused on when the skill should be used.
risks: Drift here can hide the skill or make it look broader than it is.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file first for quick orientation, then use SKILL.md for the real method.
tests: node scripts/checks/delivery-flow-check.mjs
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/frontend-delivery/README.md
  - .claude/skills/acceptance-validation/README.md
---

# README.md
