---
fileId: contextrail-template:tests:contract:pwa-hex
module: tests/contract
stability: experimental
steward: pwa-module
api: Test
boundedContext: pwa
summary: Structural proof that the pwa bounded module follows the hex folder, public-api, and README contract.
owns: Hex-shape assertions for the pwa module.
boundaries: Reads filesystem layout and public-api exports only. No behavior tests here.
invariants: domain/, ports/, adapters/, public-api.mjs, and README.md must exist. Unit tests must import only from public-api.mjs.
specRefs:
  - TPL-001
---

# pwa-hex-contract.test.mjs
