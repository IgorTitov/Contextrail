---
fileId: contextrail-template:tests:unit:rate-limit
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - modules/rate-limit/public-api.mjs
summary: Unit proof for the rate-limit bounded module — token-bucket math, adapter behavior, and port validation.
owns: Unit proof for the rate-limit bounded module.
boundaries: Test only the public API surface. No deep imports.
invariants: Token-bucket domain is pure; memory adapter satisfies assertRateLimiterPort().
securityPrivacy: Test-only; no I/O.
notesForLLM: This test file imports exclusively from public-api.mjs to prove the hexagonal import rule.
tests: self
linkedDocs: modules/rate-limit/README.md
related: modules/rate-limit/public-api.mjs
specRefs:
  - TPL-001
---

# rate-limit.test.mjs
