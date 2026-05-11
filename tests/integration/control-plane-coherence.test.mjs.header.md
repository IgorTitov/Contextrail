---
fileId: contextrail-template:tests:integration:control-plane-coherence
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
  - .claude/rules/architecture.md
  - .claude/agents/README.md
  - .claude/skills/README.md
  - .claude/skills/trunk-bba/SKILL.md
  - scripts/checks/README.md
  - .githooks/pre-commit
  - docs/README.md
  - docs/adr/0002-trunk-based-delivery.md
summary: Prove that the new control-plane architect, supervisor, product-planner routing, drift-check scripts, architecture rules, trunk-bba skill, and delivery-model ADR agree with the canonical repo surfaces.
owns: Integration proof that the new control-plane surfaces agree on names, architecture and delivery-model claims, and invocation paths.
boundaries: This file is an integration spec only. Keep it deterministic and filesystem-local.
invariants: Assertions stay local-only and compare real repository surfaces that can drift independently.
risks: Weak coverage here lets the new architect/supervisor layer drift away from the repo surfaces it is supposed to protect.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Prefer high-signal agreement checks over broad parsing logic. This test should fail when canonical names or workflow claims drift.
tests: pnpm test:integration
linkedDocs:
  - tests/integration/README.md
  - scripts/checks/README.md
  - docs/adr/0002-trunk-based-delivery.md
related:
  - tests/integration/repo-workflow.test.mjs
  - scripts/checks/control-plane-check.mjs
---

# control-plane-coherence.test.mjs
