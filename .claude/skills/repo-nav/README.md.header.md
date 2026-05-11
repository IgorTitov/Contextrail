---
fileId: contextrail-template:.claude:skills:repo-nav:README
module: .claude/skills/repo-nav
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/repo-nav/SKILL.md
  - .claude/agents/repo-cartographer.md
summary: Introduce the repo-nav skill folder and clarify when to use it for quick orientation and minimal-reading repository navigation.
owns: The folder-level entrypoint for the repo-nav skill and its navigation use case.
boundaries: This file is a quick folder guide only. It must not duplicate the reading-order method from SKILL.md.
invariants: The README stays short, navigation-focused, and aligned with the actual repository-orientation workflow.
risks: Drift here can make the skill seem broader or vaguer than its actual navigation role.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file for quick orientation, then go to SKILL.md for the actual reading-order method.
tests: Manual review plus scripts/checks/header-check.mjs and readme-check.mjs
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/repo-nav/SKILL.md
  - .claude/agents/repo-cartographer.md
---

# README.md
