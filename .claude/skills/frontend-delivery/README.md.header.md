---
fileId: contextrail-template:.claude:skills:frontend-delivery:README
module: .claude/skills/frontend-delivery
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/frontend-delivery/SKILL.md
  - .claude/agents/frontend-specialist.md
summary: Introduce the frontend-delivery skill folder and clarify when to use it for user-visible implementation work.
owns: The folder-level entrypoint for the frontend-delivery skill.
boundaries: This file is a quick folder guide only. It must not duplicate the full frontend method.
invariants: The README stays short, repository-specific, and focused on when the skill should be used.
risks: Drift here can hide the skill or make it look broader than it is.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file first for quick orientation, then use SKILL.md for the full method.
tests: node scripts/checks/delivery-flow-check.mjs
linkedDocs: .claude/CLAUDE.md
related: .claude/skills/feature-delivery/README.md
---

# README.md
