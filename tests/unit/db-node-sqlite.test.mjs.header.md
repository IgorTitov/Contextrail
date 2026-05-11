---
fileId: contextrail-template:tests:unit:db-node-sqlite
module: tests/unit
stability: evolving
steward: shared
api: "Unit test suite"
dependsOn:
  - modules/db/public-api.mjs
  - modules/db/adapters/node-sqlite-adapter.mjs
summary: Unit proof for the createNodeSqliteAdapter factory and its DatabasePort conformance.
owns: Port-conformance, query/execute parameter binding, transaction commit/rollback, in-tx visibility, and post-close behavior for the node:sqlite adapter.
boundaries: Pure unit test against an in-memory SQLite database. Skips entire suite on Node engines without node:sqlite (Node <22.5).
invariants: Adapter must satisfy assertDatabasePort. Transactions must roll back on thrown errors. Test must remain importable on the global engine floor (Node ≥18.18) — only the suite body is gated.
risks: Engine detection (process.versions.node parsing) must stay correct across Node version-string formats.
securityPrivacy: Uses :memory: database; no filesystem writes, no network.
notesForLLM: When adding behavior to node-sqlite-adapter.mjs, add the failing case here first.
tests:
  - self
linkedDocs:
  - modules/db/adapters/node-sqlite-adapter.mjs
specRefs:
  - TPL-001
---

# db-node-sqlite.test.mjs
