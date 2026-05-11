---
fileId: contextrail-template:tests:integration:delivery-flow-coherence
module: tests/integration
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - package.json
  - .claude/CLAUDE.md
  - .claude/agents/README.md
  - .claude/skills/README.md
  - .claude/agents/repo-architect.md
  - .claude/agents/feature-implementer.md
  - .claude/agents/frontend-specialist.md
  - .claude/agents/acceptance-tester.md
  - .claude/rules/architecture.md
  - .claude/rules/development.md
  - scripts/checks/README.md
  - .githooks/pre-commit
summary: Prove that the implementation, frontend, and acceptance lanes plus the delivery-flow check agree across canonical repository surfaces.
owns: Integration proof that the new delivery surfaces agree on names, bounded-reading claims, and invocation paths.
boundaries: This file is an integration spec only. Keep it deterministic and filesystem-local.
invariants: Assertions stay local-only and compare real repository surfaces that can drift independently.
risks: Weak coverage here lets the new delivery layer drift away from the repo surfaces it is supposed to protect.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Prefer high-signal agreement checks over broad parsing logic. This test should fail when canonical delivery-lane names or rules drift.
tests: pnpm test:integration
linkedDocs:
  - tests/integration/README.md
  - scripts/checks/README.md
related:
  - scripts/checks/delivery-flow-check.mjs
  - tests/contract/delivery-agents-contract.test.mjs
---

# delivery-flow-coherence.test.mjs
