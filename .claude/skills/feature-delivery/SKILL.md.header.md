---
fileId: contextrail-template:.claude:skills:feature-delivery:SKILL
module: .claude/skills/feature-delivery
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - .claude/rules/architecture.md
  - .claude/rules/development.md
  - .claude/skills/repo-nav/SKILL.md
  - .claude/skills/trunk-bba/SKILL.md
  - .claude/skills/tdd/SKILL.md
  - scripts/checks/delivery-flow-check.mjs
summary: Define the canonical bounded-implementation method for backlog slices in this template.
owns: The reusable method for bounded implementation work on one backlog slice at a time.
boundaries: This skill defines implementation method only. It must not replace product planning, structural architecture review, or acceptance closure.
invariants: Touched files are read deeply, untouched areas are navigated through headers/public APIs/tests, and slices stay small enough to reason about locally.
risks: Drift here can normalize broad code wandering, large-context implementation passes, or slices that are too wide for later agents and smaller local models to handle safely.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read deeply where you will edit. For the rest of the repo, stop at headers, public APIs, tests, and folder docs unless evidence forces a deeper dive. Prefer slices small enough that a weaker local model could still understand the touched module.
tests:
  - node scripts/checks/delivery-flow-check.mjs
  - tests/contract/delivery-agents-contract.test.mjs
  - tests/integration/delivery-flow-coherence.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/rules/architecture.md
  - .claude/agents/feature-implementer.md
related:
  - .claude/skills/frontend-delivery/SKILL.md
  - .claude/skills/acceptance-validation/SKILL.md
  - .claude/skills/repo-nav/SKILL.md
---

# SKILL.md
