---
fileId: contextrail-template:.claude:skills:bdd-playwright:scripts:run-playwright-check
module: .claude/skills/bdd-playwright/scripts
stability: evolving
steward: human
api: "Helper CLI: node .claude/skills/bdd-playwright/scripts/run-playwright-check.mjs"
dependsOn:
  - node:child_process
  - node:fs
  - package.json
summary: Run the first available Playwright-compatible repository script so the bdd-playwright skill can verify visible behavior with minimal local logic.
owns: The local helper that locates and runs an existing Playwright-compatible package script for the bdd-playwright skill.
boundaries: This file is a lightweight delegating helper only. It must not become a full Playwright runner, config resolver, or test orchestrator.
invariants: The script stays deterministic, reads package.json locally, and executes only the first known compatible candidate script if present.
risks: Drift here can launch the wrong script, hide missing Playwright setup, or make the skill seem more automatic than it really is.
securityPrivacy: Local helper content only; avoid embedding secrets or networked side effects.
notesForLLM: Keep this helper narrow and explicit. Prefer delegating to real repository scripts over inventing new Playwright execution behavior here.
tests:
  - tests/integration/repo-workflow.test.mjs
  - manual helper execution in repositories with and without compatible Playwright scripts
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/bdd-playwright/SKILL.md
related:
  - .claude/skills/bdd-playwright/SKILL.md
  - package.json
---

# run-playwright-check.mjs
