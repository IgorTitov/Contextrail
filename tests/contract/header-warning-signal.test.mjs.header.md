---
fileId: contextrail-template:tests:contract:header-warning-signal-test
module: tests/contract
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - scripts/checks/_shared.mjs
  - README.md
  - VERSION.header.md
summary: Prove that header-check warning signal stays focused on header quality issues and does not flood the repo with generic traceability emptiness warnings.
owns: Contract proof for the warning-signal behavior of header validation on representative repository files.
boundaries: This file is a contract spec only. Keep it deterministic and focused on durable warning-policy expectations.
invariants: Assertions remain local-only and protect high-signal warning behavior instead of broad workflow details.
risks: If this spec weakens, low-signal warning floods can return and hide the small number of header issues that matter.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Prefer assertions that protect signal quality. This file should fail when generic traceability-warning noise or semantically empty VERSION metadata returns.
tests: pnpm test:contract
linkedDocs:
  - tests/contract/README.md
  - scripts/checks/header-check.mjs
  - scripts/checks/spec-check.mjs
related:
  - tests/contract/header-sidecar-contract.test.mjs
  - scripts/checks/_shared.mjs
  - VERSION.header.md
---

# header-warning-signal.test.mjs
