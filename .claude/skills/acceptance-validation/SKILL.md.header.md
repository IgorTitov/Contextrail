---
fileId: contextrail-template:.claude:skills:acceptance-validation:SKILL
module: .claude/skills/acceptance-validation
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/bdd-playwright/SKILL.md
  - .claude/skills/spec-traceability/SKILL.md
  - scripts/checks/test-gate.mjs
  - scripts/checks/delivery-flow-check.mjs
summary: Define the canonical acceptance-closure method for implemented backlog slices in this template.
owns: The reusable method for acceptance closure on implemented slices.
boundaries: This skill defines acceptance-validation method only. It must not replace proving strategy review, broad implementation, or release handling.
invariants: Acceptance is evaluated from canonical refs first, only the smallest missing proofs are added, and ready-for-finalization is earned rather than assumed.
risks: Drift here can normalize code-complete-but-unproven work, redundant test sprawl, or finalization without real acceptance coverage.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Start from acceptance and refs, not from gut feel. Tighten only the smallest missing proof. Ready-for-finalization means the implemented slice is actually covered and the deterministic gates are green.
tests:
  - node scripts/checks/delivery-flow-check.mjs
  - node scripts/checks/test-gate.mjs
  - tests/contract/delivery-agents-contract.test.mjs
  - tests/integration/delivery-flow-coherence.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/agents/acceptance-tester.md
  - .claude/agents/test-guardian.md
related:
  - .claude/skills/bdd-playwright/SKILL.md
  - .claude/skills/spec-traceability/SKILL.md
---

# SKILL.md
