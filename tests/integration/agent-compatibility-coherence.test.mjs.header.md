---
fileId: contextrail-template:tests:integration:agent-compatibility-coherence
module: tests/integration
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - node:child_process
  - node:os
  - node:path
  - package.json
  - .githooks/pre-commit
  - AGENTS.md
  - .claude/CLAUDE.md
  - docs/agent-contract/README.md
  - scripts/agent-contract/check.mjs
  - scripts/checks/pre-impl-gate.mjs
summary: Prove that the canonical agent contract, package scripts, pre-commit wiring, and generated adapters stay aligned.
owns: Integration proof that shared adapter wiring and parity entrypoints agree across repository surfaces.
boundaries: This file is an integration spec only. Keep it deterministic and filesystem-local.
invariants: Assertions stay local-only and compare real repository surfaces or execute a real local parity entrypoint.
risks: Weak coverage here lets the canonical contract, generated adapters, and commit-time wiring drift apart.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Prefer high-signal agreement checks over broad parsing logic. This test should fail when adapter wiring or canonical-source claims drift.
tests: pnpm test:integration
linkedDocs:
  - tests/integration/README.md
  - docs/agent-contract/README.md
  - scripts/agent-contract/README.md
related:
  - scripts/agent-contract/sync.mjs
  - scripts/agent-contract/check.mjs
---

# agent-compatibility-coherence.test.mjs
