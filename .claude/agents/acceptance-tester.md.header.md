---
fileId: contextrail-template:.claude:agents:acceptance-tester
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/acceptance-validation/SKILL.md
  - .claude/skills/bdd-playwright/SKILL.md
  - .claude/skills/spec-traceability/SKILL.md
  - scripts/checks/test-gate.mjs
  - scripts/checks/delivery-flow-check.mjs
summary: Route acceptance-oriented validation to a narrow repository-local tester that closes implemented slices against backlog acceptance and proof expectations.
owns: The operational contract for acceptance-oriented validation and readiness closure on implemented backlog slices.
boundaries: This file defines an acceptance-validation role only. It must not replace feature-implementer, frontend-specialist, repo-architect, product-planner, or release-operator.
invariants: The agent works from acceptance and refs first, adds only the smallest missing proofs, and issues a ready-for-finalization verdict only when the slice is actually proven.
risks: Drift here can normalize “looks done” closure without proof, duplicate test-guardian authority, or broaden validation work into open-ended QA churn.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Start from acceptance, tests, and trace refs. Add or tighten only the smallest missing proof. A slice is ready for finalization only when acceptance is actually covered and the deterministic gates are green.
tests:
  - node scripts/checks/delivery-flow-check.mjs
  - tests/contract/delivery-agents-contract.test.mjs
  - tests/integration/delivery-flow-coherence.test.mjs
  - node scripts/checks/test-gate.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/acceptance-validation/SKILL.md
  - .claude/agents/test-guardian.md
related:
  - .claude/agents/test-guardian.md
  - .claude/agents/feature-implementer.md
  - .claude/agents/release-operator.md
---

# acceptance-tester.md
