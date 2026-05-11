---
fileId: contextrail-template:tests:contract:prerender-hex-contract-test
module: tests/contract
stability: experimental
steward: prerender-module
api: Tests
boundedContext: prerender
summary: Prove that the prerender bounded module follows the hex architecture contract.
owns: The structural contract proof for prerender.
boundaries: Tests only. Asserts folder layout and public-api surface.
invariants: Ensures domain/ports/adapters folders, public-api.mjs, README, and proper port/adapter file layout.
specRefs:
  - TPL-001
---

# prerender-hex-contract.test.mjs
