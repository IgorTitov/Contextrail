---
fileId: contextrail-template:tests:contract:seo-hex
module: tests/contract
stability: experimental
steward: seo-module
api: Test
boundedContext: seo
summary: Structural proof that the seo bounded module follows the hex folder, public-api, and README contract.
owns: Hex-shape assertions for the seo module.
boundaries: Reads filesystem layout and public-api exports only. No behavior tests here.
invariants: domain/, ports/, adapters/, public-api.mjs, and README.md must exist. Unit tests must import only from public-api.mjs.
specRefs:
  - TPL-001
---

# seo-hex-contract.test.mjs
