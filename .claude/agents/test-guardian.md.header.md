---
fileId: contextrail-template:.claude:agents:test-guardian
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/tdd/SKILL.md
  - .claude/skills/bdd-playwright/SKILL.md
  - .claude/skills/spec-traceability/SKILL.md
  - scripts/checks/test-gate.mjs
summary: Route behavior-change review to a subagent that enforces TDD, regression-first bugfixes, smallest-proving-test selection, and BDD completeness for user-visible changes.
owns: The operational contract for test strategy, regression-first fixes, and proving-layer selection for behavior changes.
boundaries: This file governs test-guardian behavior only. It must not become a duplicate of the detailed testing skills or a generic QA manifesto.
invariants: The agent should prefer the smallest proving test set, require a failing regression test for bugfixes, and require Gherkin coverage for user-visible workflow changes.
risks: Drift here can normalize overbroad E2E usage, under-tested behavior changes, or missing regression coverage.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Use this agent when behavior changes or proof strategy is uncertain. Spend judgment on the proving layer and regression signal, not on writing every possible test.
tests:
  - scripts/checks/test-gate.mjs
  - manual invocation on behavior-changing work
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/tdd/SKILL.md
  - .claude/skills/bdd-playwright/SKILL.md
  - .claude/rules/testing.md
related:
  - tests/bdd/features/template.feature
  - scripts/checks/test-gate.mjs
---

# test-guardian.md
