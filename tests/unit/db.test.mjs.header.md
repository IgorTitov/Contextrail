---
fileId: contextrail-template:tests:unit:db.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: modules/db/public-api.mjs
summary: Unit tests for the db module covering memory adapter, query builder, transactions, and port assertions.
owns: Unit-level proof for db module domain logic and memory adapter.
boundaries: Tests db module internals through public-api only. No deep imports.
invariants: Must cover all public-api exports.
securityPrivacy: No secrets.
notesForLLM: Unit tests for db module. For user-visible behavior tests, see the BDD layer.
tests: self
related:
  - tests/bdd/db.test.mjs
  - tests/contract/db-hex-contract.test.mjs
---

# db.test.mjs
