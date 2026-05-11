---
fileId: contextrail-template:.claude:skills:readme-discipline:README
module: .claude/skills/readme-discipline
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/readme-discipline/SKILL.md
  - scripts/checks/readme-check.mjs
  - scripts/checks/readme-fix.mjs
summary: Introduce the readme-discipline skill folder and clarify when to use it for folder-level README coverage and navigation cleanup.
owns: The folder-level entrypoint for the readme-discipline skill and its README coverage context.
boundaries: This file is a quick folder guide only. It must not duplicate the detailed method or absorb script-level behavior.
invariants: The README stays short, folder-navigation aware, and aligned with current README coverage expectations.
risks: Drift here can hide the skill’s real use case or blur the split between folder guidance and the method itself.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file for quick orientation, then use SKILL.md when you need the actual folder-README method.
tests: Manual review plus scripts/checks/header-check.mjs and readme-check.mjs
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/readme-discipline/SKILL.md
  - .claude/agents/readme-guardian.md
---

# README.md
