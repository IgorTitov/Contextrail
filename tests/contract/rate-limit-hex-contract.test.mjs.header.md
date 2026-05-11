---
fileId: contextrail-template:tests:contract:rate-limit-hex-contract
module: tests/contract
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - modules/rate-limit/public-api.mjs
summary: Prove that the rate-limit bounded module follows the hex architecture contract.
owns: Contract proof that the rate-limit module satisfies hex folder structure, public-api surface, and README discipline.
boundaries: Contract-level assertions only; behavior is covered by tests/unit/rate-limit.test.mjs.
invariants: rate-limit must have domain/, ports/, adapters/, a public-api.mjs, a README, and must not be deep-imported from unit tests.
securityPrivacy: Test-only; no I/O beyond filesystem reads.
notesForLLM: Keep this contract test in sync with the rate-limit hex layout.
tests: self
linkedDocs: modules/rate-limit/README.md
related: modules/rate-limit/public-api.mjs
specRefs:
  - TPL-001
---

# rate-limit-hex-contract.test.mjs
