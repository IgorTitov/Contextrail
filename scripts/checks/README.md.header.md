---
fileId: contextrail-template:scripts:checks:README
module: scripts/checks
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - scripts/checks/_shared.mjs
  - package.json
  - .githooks/pre-commit
summary: Index of deterministic repo scripts used by the template.
owns: Index of deterministic repo scripts used by the template.
boundaries: This file belongs to deterministic repository tooling. It should stay small, scriptable, and free of unrelated repository policy.
invariants: Behavior remains deterministic, local-only, and callable from package.json and git-hook workflow without hidden side effects.
risks: Behavior drift here can break repository automation, hook execution, or artifact generation.
securityPrivacy: Local filesystem and process execution only; keep behavior deterministic and avoid secrets or network access.
notesForLLM: Keep behavior deterministic and easy to validate from the command line. Do not add fuzzy heuristics unless necessary.
tests:
  - tests/integration/repo-workflow.test.mjs
  - tests/integration/control-plane-coherence.test.mjs
  - tests/integration/design-flow-coherence.test.mjs
  - tests/integration/delivery-flow-coherence.test.mjs
  - tests/contract/product-docs-contract.test.mjs
  - tests/contract/ui-selector-registry-contract.test.mjs
  - tests/contract/delivery-agents-contract.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - scripts/README.md
  - tests/README.md
related:
  - scripts/checks/control-plane-check.mjs
  - scripts/checks/product-docs-check.mjs
  - scripts/checks/design-docs-check.mjs
  - scripts/checks/delivery-flow-check.mjs
  - package.json
---

# README.md
