---
fileId: contextrail-template:tests:contract:tenancy-hex
module: tests/contract
stability: experimental
steward: tenancy-module
api: Test
boundedContext: tenancy
summary: Structural hex contract test for the tenancy module — folder layout, public API surface, no deep imports in unit tests.
owns: The tenancy hex folder contract.
boundaries: Structural assertions only. Runtime behavior lives in tests/unit/tenancy.test.mjs.
invariants: Every public-api export listed here must exist and be callable.
notesForLLM: Keep this file in sync with public-api.mjs when exports change.
specRefs:
  - TPL-001
---

# tenancy-hex-contract.test.mjs
