---
fileId: contextrail-template:tests:contract:script-errors-contract
module: tests/contract
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - scripts/lib/errors.mjs
summary: Prove that the typed error hierarchy exists, is importable, and is adopted by at least two repo scripts.
owns: Contract proof that the typed error hierarchy exists and is adopted by repo scripts.
boundaries: This file is a deterministic contract spec only.
invariants: Must fail if the error module disappears, loses exports, or stops being imported by adopted scripts.
risks: Without this contract, scripts could silently revert to plain-string errors.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Keep assertions high-signal. This proves adoption, not error internals.
tests: pnpm test:contract
linkedDocs:
  - tests/contract/README.md
  - scripts/lib/README.md
related:
  - scripts/lib/errors.mjs
  - scripts/checks/readme-check.mjs
  - scripts/checks/architecture-check.mjs
---

# script-errors-contract.test.mjs
