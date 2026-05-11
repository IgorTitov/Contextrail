---
fileId: contextrail-template:scripts:checks:delivery-flow-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/delivery-flow-check.mjs [--json]"
dependsOn:
  - node:fs/promises
  - node:path
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
  - tests/integration/README.md
  - tests/contract/README.md
summary: Validate agreement across canonical implementation, frontend, and acceptance-lane files plus the bounded-reading rules that keep feature work small and LLM-friendly.
owns: Deterministic agreement checks for the template’s implementation, frontend, and acceptance delivery lanes.
boundaries: This file is a drift detector only. It must not mutate repository state, replace semantic review, or become a second policy source.
invariants: Behavior remains deterministic, local-only, and explicit; failures point at disagreement between real repository surfaces.
risks: If this script drifts, the repo can silently lose the bounded-reading and small-slice rules that make later autonomous implementation tractable.
securityPrivacy: Local filesystem only; avoid network access and hidden side effects.
notesForLLM: Keep checks high-signal and source-oriented. Add a new assertion only when two real repository surfaces can drift apart.
tests:
  - tests/integration/delivery-flow-coherence.test.mjs
  - tests/contract/delivery-agents-contract.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - scripts/checks/README.md
related:
  - scripts/checks/control-plane-check.mjs
  - scripts/checks/product-docs-check.mjs
  - tests/integration/delivery-flow-coherence.test.mjs
---

# delivery-flow-check.mjs
