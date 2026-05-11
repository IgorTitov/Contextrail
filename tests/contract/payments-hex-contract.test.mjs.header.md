---
fileId: contextrail-template:tests:contract:payments-hex-contract
module: tests/contract
stability: evolving
steward: shared
api: Test
boundedContext: payments
summary: Hex architecture contract test for the payments module.
owns: Structural assertions — folder layout, public-api exports, README hexagonal mention, deep-import prohibition.
boundaries: Pure structural assertions. No behavior tests.
invariants: Adapters live in adapters/, ports in ports/, domain in domain/. public-api.mjs is the only cross-module entry.
notesForLLM: Update when adding new domain, port, or adapter files under modules/payments.
specRefs:
  - TPL-001
---

# payments-hex-contract.test.mjs
