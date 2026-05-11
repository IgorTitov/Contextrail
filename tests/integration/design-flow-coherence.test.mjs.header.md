---
fileId: contextrail-template:tests:integration:design-flow-coherence
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
  - .claude/agents/designer.md
  - .claude/agents/product-planner.md
  - .claude/agents/frontend-specialist.md
  - .claude/rules/architecture.md
  - .claude/rules/development.md
  - docs/README.md
  - docs/design/README.md
  - docs/design/design-system.md
  - scripts/checks/README.md
  - .githooks/pre-commit
summary: Prove that the design lane, design-docs-check script, and selector-registry policy agree across canonical repository surfaces.
owns: Integration proof that the new design surfaces agree on names, selector-registry claims, and invocation paths.
boundaries: This file is an integration spec only. Keep it deterministic and filesystem-local.
invariants: Assertions stay local-only and compare real repository surfaces that can drift independently.
risks: Weak coverage here lets the design lane drift away from the repo surfaces it is supposed to protect.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Prefer high-signal agreement checks over broad parsing logic. This test should fail when canonical design-lane names or selector-registry rules drift.
tests: pnpm test:integration
linkedDocs:
  - tests/integration/README.md
  - scripts/checks/README.md
  - docs/design/README.md
related:
  - scripts/checks/design-docs-check.mjs
  - tests/contract/ui-selector-registry-contract.test.mjs
---

# design-flow-coherence.test.mjs
