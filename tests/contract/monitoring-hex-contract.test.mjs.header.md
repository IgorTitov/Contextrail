---
fileId: contextrail-template:tests:contract:monitoring-hex-contract
module: tests/contract
stability: evolving
steward: shared
api: "Test"
summary: Contract test proving modules/monitoring follows the hex architecture rules — folder layout, public-api surface, no deep imports from tests.
owns: Structural proof surface for the monitoring bounded module.
boundaries: Reads monitoring sources from disk; does not import adapters directly.
invariants: Must pass before commit; failures block the slice.
specRefs:
  - TPL-001
---

# monitoring-hex-contract.test.mjs
