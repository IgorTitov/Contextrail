---
fileId: contextrail-template:tests:contract:README
module: tests/contract
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - tests/contract/header-sidecar-contract.test.mjs
  - tests/contract/header-warning-signal.test.mjs
  - tests/contract/header-version-stamp.test.mjs
  - tests/contract/product-docs-contract.test.mjs
  - tests/contract/ui-selector-registry-contract.test.mjs
  - tests/contract/delivery-agents-contract.test.mjs
  - scripts/checks/_shared.mjs
summary: Explain the repository contracts that should stay stable across template edits.
owns: The contract-test layer entrypoint for stable repository conventions.
boundaries: This folder is for durable repo contracts only. Do not use it for arbitrary integration checks.
invariants: Contract tests stay deterministic, local-only, and focused on conventions with downstream tooling impact.
risks: Weak contract coverage lets subtle convention drift break agents, hooks, or repo tooling.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Use this folder for conventions that many other surfaces rely on.
tests: pnpm test:contract
linkedDocs:
  - tests/README.md
  - .claude/CLAUDE.md
related:
  - tests/contract/header-sidecar-contract.test.mjs
  - tests/contract/header-warning-signal.test.mjs
  - tests/contract/header-version-stamp.test.mjs
  - tests/contract/product-docs-contract.test.mjs
  - tests/contract/ui-selector-registry-contract.test.mjs
  - tests/contract/delivery-agents-contract.test.mjs
---

# README.md
