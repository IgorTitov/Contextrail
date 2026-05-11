---
fileId: contextrail-template:.claude:skills:bdd-playwright:README
module: .claude/skills/bdd-playwright
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/bdd-playwright/SKILL.md
  - .claude/skills/bdd-playwright/gherkin-rules.md
  - .claude/skills/bdd-playwright/scripts/*
summary: Introduce the bdd-playwright skill folder and clarify when this skill should be used for visible behavior changes.
owns: The folder-level entrypoint for the bdd-playwright skill and its supporting references.
boundaries: This file is a quick-use folder guide only. It must not replace the SKILL.md method or absorb detailed Gherkin rules and helper behavior.
invariants: The README stays short, use-case oriented, and aligned with the actual supporting files in the folder.
risks: Drift here can make agents miss the supporting rule and helper files or use the skill for the wrong class of change.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file first for quick orientation, then go to SKILL.md for the method and the supporting files for details.
tests: Manual review plus scripts/checks/header-check.mjs and readme-check.mjs
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/bdd-playwright/SKILL.md
  - .claude/skills/bdd-playwright/gherkin-rules.md
---

# README.md
