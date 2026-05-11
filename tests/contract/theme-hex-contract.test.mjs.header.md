---
fileId: contextrail-template:tests:contract:theme-hex-contract
module: tests/contract
stability: experimental
steward: theme-module
api: Tests
boundedContext: theme
summary: Structural hex contract proof for the theme module — folders, public-api, test discipline.
owns: Contract coverage of the theme hex folder layout and public-api surface.
boundaries: Structural tests only. No behavior assertions beyond exports typing.
invariants: Must fail if the hex layout or the public-api surface drifts.
specRefs:
  - TPL-001
---

# theme-hex-contract.test.mjs
