---
fileId: contextrail-template:tests:contract:e2e-modes-contract
module: tests/contract
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
summary: Prove that the template supports multiple E2E execution modes through env vars and launcher flags.
owns: Contract proof that the template supports multiple E2E execution modes.
boundaries: This file is a deterministic contract spec only.
invariants: Must fail if multi-mode env var support or launcher flags are removed.
risks: Without this contract, mode support could silently regress.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Keep assertions high-signal. This proves mode wiring, not Playwright behavior.
tests: pnpm test:contract
linkedDocs:
  - tests/e2e/README.md
  - playwright.config.mjs
related:
  - playwright.config.mjs
  - scripts/checks/run-e2e.mjs
  - package.json
---

# e2e-modes-contract.test.mjs
