---
fileId: contextrail-template:.claude:skills:tdd:SKILL
module: .claude/skills/tdd
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - scripts/checks/test-gate.mjs
  - .claude/rules/testing.md
summary: Enforce red-green-refactor, regression-first bugfixes, and small proving loops so changes are proven before they are broadened.
owns: The reusable method for red-green-refactor delivery and regression-first bugfix discipline.
boundaries: This file defines a reusable proving method. It must not become a generic testing handbook or replace broader proving-layer selection guidance.
invariants: The skill stays focused on failing-first tests, small implementation steps, and deterministic proof before expansion to broader layers.
risks: Drift here can normalize test-after coding, broad unproven changes, or bugfixes without reproduction.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this skill when implementing or fixing behavior. Preserve the smallest proving loop and require a failing test before the fix for bug work.
tests:
  - node scripts/checks/test-gate.mjs
  - manual skill use on behavior-changing work
linkedDocs: .claude/CLAUDE.md
related:
  - scripts/checks/test-gate.mjs
  - .claude/agents/test-guardian.md
  - .claude/rules/testing.md
---

# SKILL.md
