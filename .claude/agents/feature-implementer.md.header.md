---
fileId: contextrail-template:.claude:agents:feature-implementer
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/feature-delivery/SKILL.md
  - .claude/skills/tdd/SKILL.md
  - .claude/skills/trunk-bba/SKILL.md
  - .claude/skills/spec-traceability/SKILL.md
  - .claude/rules/architecture.md
  - .claude/rules/development.md
  - scripts/checks/delivery-flow-check.mjs
  - scripts/checks/claim-check.mjs
  - .claims/README.md
summary: Route day-to-day feature implementation to a narrow repository-local builder that works from implementation-ready backlog slices without duplicating product or architecture authority.
owns: The operational contract for turning one implementation-ready backlog slice into the smallest safe code and test change set.
boundaries: This file defines an implementation role only. It must not replace product-planner, repo-architect, frontend-specialist, acceptance-tester, or release-operator.
invariants: The agent reads the files it will change deeply, uses headers/public APIs/tests for untouched areas, keeps the slice bounded, and escalates when a request is too cross-cutting for one safe implementation pass.
risks: Drift here can normalize broad code wandering, accidental architecture breakage, or implementation work that is too large for later agents and smaller local models to reason about.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Start from an implementation-ready backlog slice. Deep-read the files you will actually change and their direct collaborators. For the rest of the repo, prefer headers, public APIs, tests, and nearby docs before opening internals.
tests:
  - node scripts/checks/delivery-flow-check.mjs
  - tests/contract/delivery-agents-contract.test.mjs
  - tests/integration/delivery-flow-coherence.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/rules/architecture.md
  - .claude/skills/feature-delivery/SKILL.md
related:
  - .claude/agents/repo-architect.md
  - .claude/agents/product-planner.md
  - .claude/agents/frontend-specialist.md
  - .claude/agents/acceptance-tester.md
---

# feature-implementer.md
