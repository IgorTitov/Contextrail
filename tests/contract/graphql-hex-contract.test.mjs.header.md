---
fileId: contextrail-template:tests:contract:graphql-hex-contract
module: tests/contract
stability: experimental
steward: graphql-module
api: Tests
boundedContext: graphql
summary: Structural hex contract proof for the graphql module — folders, public-api, test discipline.
owns: Contract coverage of the graphql hex folder layout and public-api surface.
boundaries: Structural tests only. No behavior assertions beyond exports typing.
invariants: Must fail if the hex layout or the public-api surface drifts.
specRefs:
  - TPL-001
---

# graphql-hex-contract.test.mjs
