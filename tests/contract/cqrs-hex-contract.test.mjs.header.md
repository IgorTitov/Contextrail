---
fileId: contextrail-template:tests:contract:cqrs-hex-contract
module: tests/contract
stability: experimental
steward: cqrs-module
api: Test
boundedContext: cqrs
summary: Structural hex contract proof for the cqrs bounded module.
owns: Folder layout, public-api exports, and the no-deep-import rule for tests/unit/cqrs.test.mjs.
boundaries: Read-only filesystem + dynamic import of public-api.mjs. No adapter wiring.
invariants: Every hex layer file is required. Every public-api export is a function. Unit tests do not deep-import internals.
notesForLLM: Extend this file when adding new public-api exports or new hex layer files.
specRefs:
  - TPL-001
---

# cqrs-hex-contract.test.mjs
