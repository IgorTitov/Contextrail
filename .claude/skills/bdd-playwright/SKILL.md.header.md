---
fileId: contextrail-template:.claude:skills:bdd-playwright:SKILL
module: .claude/skills/bdd-playwright
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - tests/bdd/features/template.feature
  - .claude/skills/bdd-playwright/scripts/run-playwright-check.mjs
  - .claude/rules/testing.md
  - package.json
summary: Translate visible UI or UX changes into concrete Gherkin scenarios and Playwright-oriented proof steps that fit the repository’s user-facing test workflow.
owns: The reusable method for converting visible behavior changes into updated Gherkin plus Playwright-oriented verification.
boundaries: This file defines a reusable method for user-visible behavior proof. It must not become a generic testing handbook or replace deterministic test commands.
invariants: The skill stays centered on visible behavior, Gherkin coverage, and Playwright-oriented proof steps that match the repository’s current test flow.
risks: Drift here can normalize UI changes without scenario updates, mismatch visible behavior and proof, or push agents toward vague browser testing.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this skill when user-visible flows, copy, validation, or navigation change. Keep proof tied to scenarios, not just raw browser interaction.
tests:
  - node .claude/skills/bdd-playwright/scripts/run-playwright-check.mjs
  - pnpm test:bdd
  - pnpm test:e2e:smoke
linkedDocs:
  - .claude/CLAUDE.md
  - tests/README.md
related:
  - tests/bdd/features/template.feature
  - .claude/agents/test-guardian.md
  - .claude/rules/testing.md
---

# SKILL.md
