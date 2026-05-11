---
fileId: contextrail-template:tests:unit:contract-seam-example
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - apps/starter/examples/contract-seam/notifications_contract.mjs
summary: "Prove that the contract-first seam pattern works: injection, call-through, reset, and error on unwired state."
owns: Unit proof for the contract-first browser module seam pattern.
boundaries: This file tests the pattern mechanics only.
invariants: Must fail if injection, call-through, or reset behavior breaks.
risks: Without this proof the pattern example has no executable verification.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Keep assertions focused on seam mechanics — wiring, call-through, reset, unwired error.
tests: pnpm test:unit
linkedDocs: apps/starter/examples/contract-seam/README.md
related: apps/starter/examples/contract-seam/notifications_contract.mjs
---

# contract-seam-example.test.mjs
