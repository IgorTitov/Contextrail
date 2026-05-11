---
fileId: contextrail-template:tests:contract:search-hex-contract
module: tests/contract
stability: evolving
steward: shared
api: Tests
boundedContext: search
summary: Hex architecture contract proofs for the search module.
owns: Structural checks for folder layout, public-api exports, and forbidden deep imports.
boundaries: Read-only filesystem checks plus import of public-api.mjs.
invariants: Keeps the search module honest about its hex seam.
notesForLLM: Update when adding a new adapter or layer file to the search module.
specRefs:
  - TPL-001
---

# search-hex-contract.test.mjs
