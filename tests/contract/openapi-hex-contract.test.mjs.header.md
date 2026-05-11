---
fileId: contextrail-template:tests:contract:openapi-hex-contract
module: tests/contract
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - modules/openapi/public-api.mjs
summary: Contract proof that the openapi bounded module follows the hex architecture (folder layout, public-api surface, README, no deep imports from unit tests).
owns: Hex contract proof for the openapi module.
boundaries: Filesystem and import-shape checks only. No business logic.
invariants: Module must keep domain/ports/adapters layers and a single public-api.mjs entry point.
securityPrivacy: Test-only; reads files from disk.
notesForLLM: This is the structural contract test. Pair with tests/unit/openapi.test.mjs for behavior coverage.
tests: self
linkedDocs: modules/openapi/README.md
related: modules/openapi/public-api.mjs
specRefs:
  - TPL-001
---

# openapi-hex-contract.test.mjs
