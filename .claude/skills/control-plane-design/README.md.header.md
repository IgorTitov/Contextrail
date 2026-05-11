---
fileId: contextrail-template:.claude:skills:control-plane-design:README
module: .claude/skills/control-plane-design
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/control-plane-design/SKILL.md
  - .claude/agents/repo-architect.md
summary: Introduce the control-plane-design skill folder and clarify when to use it for repository-shaping design work.
owns: The folder-level entrypoint for the control-plane-design skill.
boundaries: This file is a quick folder guide only. It must not duplicate the full design method.
invariants: The README stays short, repository-specific, and focused on when the skill should be used.
risks: Drift here can hide the skill or make it look broader than it is.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file first for quick orientation, then use SKILL.md for the actual method.
tests: node scripts/checks/control-plane-check.mjs
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/control-plane-audit/README.md
  - .claude/skills/trunk-bba/README.md
---

# README.md
