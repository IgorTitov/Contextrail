---
fileId: contextrail-template:.claude:skills:bdd-playwright:scripts:README
module: .claude/skills/bdd-playwright/scripts
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/bdd-playwright/scripts/run-playwright-check.mjs
  - package.json
summary: Explain the small local helper scripts that support the bdd-playwright skill without becoming part of the main repository runtime.
owns: The folder-level guide to bdd-playwright helper scripts.
boundaries: This file is a folder guide only. It must not duplicate the implementation details of the helper scripts or the main skill method.
invariants: The folder stays small, local to the skill, and limited to helper behavior that supports visible-behavior proof.
risks: Drift here can make helper scripts look more central or more capable than they really are.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file to understand what helper scripts exist in this skill folder. Read the script itself when behavior details matter.
tests:
  - tests/integration/repo-workflow.test.mjs
  - scripts/checks/header-check.mjs
  - scripts/checks/readme-check.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/bdd-playwright/SKILL.md
related: .claude/skills/bdd-playwright/SKILL.md
---

# README.md
