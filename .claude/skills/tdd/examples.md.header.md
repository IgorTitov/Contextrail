---
fileId: contextrail-template:.claude:skills:tdd:examples
module: .claude/skills/tdd
stability: evolving
steward: shared
api: Reference examples
dependsOn:
  - .claude/skills/tdd/SKILL.md
  - scripts/checks/test-gate.mjs
summary: Show compact proving-loop examples for new behavior and bugfix work so agents can apply TDD steps consistently.
owns: The reference examples for common TDD proving loops used in new behavior and bugfix work.
boundaries: This file provides examples only. It must not become a second rule set or replace the main TDD method.
invariants: Examples stay concise, sequence-oriented, and aligned with the current red-green-refactor and regression-first expectations.
risks: Drift here can normalize weak proving loops or conflict with the main TDD method.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file to compare planned proving loops against compact examples. Keep it concrete, small, and aligned with the current testing posture.
tests: Manual review during TDD guidance updates
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/tdd/SKILL.md
  - .claude/agents/test-guardian.md
---

# examples.md
