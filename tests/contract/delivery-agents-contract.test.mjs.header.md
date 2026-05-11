---
fileId: contextrail-template:tests:contract:delivery-agents-contract
module: tests/contract
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
  - .claude/rules/architecture.md
  - .claude/rules/development.md
summary: Prove that the implementation, frontend, and acceptance-lane contracts keep their canonical role split and bounded-reading conventions stable.
owns: Contract proof that the delivery-agent layer keeps canonical routing and bounded-reading rules stable.
boundaries: This file is a deterministic contract spec only. It must not turn into a general integration suite.
invariants: Assertions stay local-only and compare stable repository surfaces that many agents and docs consume.
risks: Weak coverage here lets implementation-lane and bounded-reading drift silently across the repo.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Prefer high-signal agreement checks over large parsing logic. This test should fail when canonical delivery-lane rules drift.
tests: pnpm test:contract
linkedDocs:
  - tests/contract/README.md
  - .claude/CLAUDE.md
related:
  - scripts/checks/delivery-flow-check.mjs
  - .claude/agents/feature-implementer.md
  - .claude/agents/frontend-specialist.md
  - .claude/agents/acceptance-tester.md
---

# delivery-agents-contract.test.mjs
