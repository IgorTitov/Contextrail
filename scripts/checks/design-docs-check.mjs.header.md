---
fileId: contextrail-template:scripts:checks:design-docs-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/design-docs-check.mjs [--json]"
dependsOn:
  - node:fs/promises
  - node:path
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
  - docs/design/brandbook.md
  - docs/design/design-system.md
  - docs/design/prompts/README.md
  - docs/design/assets/README.md
  - scripts/checks/README.md
  - .githooks/pre-commit
  - tests/integration/README.md
  - tests/contract/README.md
summary: Validate agreement across canonical design-lane files, design-doc discovery, and the bounded selector-registry rule that user-visible work depends on.
owns: Deterministic agreement checks for the template’s design lane and selector-registry rule.
boundaries: This file is a drift detector only. It must not mutate repository state, replace semantic review, or become a second policy source.
invariants: Behavior remains deterministic, local-only, and explicit; failures point at disagreement between real repository surfaces.
risks: If this script drifts, the repo can silently lose the design-lane and selector-registry rules that later user-visible work depends on.
securityPrivacy: Local filesystem only; avoid network access and hidden side effects.
notesForLLM: Keep checks high-signal and source-oriented. Add a new assertion only when two real repository surfaces can drift apart.
tests:
  - tests/integration/design-flow-coherence.test.mjs
  - tests/contract/ui-selector-registry-contract.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - docs/design/README.md
  - scripts/checks/README.md
related:
  - scripts/checks/product-docs-check.mjs
  - scripts/checks/delivery-flow-check.mjs
  - tests/integration/design-flow-coherence.test.mjs
---

# design-docs-check.mjs
