---
fileId: contextrail-template:modules:db:public-api
module: modules/db
stability: evolving
steward: shared
api: Module public API
hexLayer: application
boundedContext: db
dependsOn:
  - modules/db/domain/query-builder.mjs
  - modules/db/ports/database-port.mjs
  - modules/db/adapters/memory-adapter.mjs
  - modules/db/adapters/sql-driver-adapter.mjs
  - modules/db/messages.mjs
summary: Public API surface for the db hex module — query builder, database port, and adapters.
owns: The only import surface for the db module. All cross-module access goes through this file.
boundaries: Only re-exports from domain, ports, adapters, and messages. No logic lives here.
invariants: Every public symbol of the db module must be exported here. No deep imports allowed.
risks: Adding exports without tests breaks the contract surface.
securityPrivacy: No secrets. Query builder is parameterized to prevent SQL injection.
notesForLLM: "This is the db module's public API. Import from here, never from internal files. Exports: createQueryBuilder, assertDatabasePort, createMemoryDatabaseAdapter, createSqlDriverAdapter, and i18n helpers."
tests:
  - tests/unit/db.test.mjs
  - tests/contract/db-contract.test.mjs
linkedDocs:
  - modules/db/README.md
  - modules/db/manifest.json
  - docs/_generated/dependency-graph.json
specRefs:
  - TPL-177
  - TPL-001
related: apps/api-starter/app.mjs
allowedDependencies:
  - "./domain/*"
  - "./application/*"
  - "./ports/*"
  - "./adapters/*"
  - "./messages.*"
  - "./types.*"
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/ports/**"
  - "modules/<other>/adapters/**"
  - react
  - express
  - fastify
  - "node:*"
exports:
  - assertDatabasePort
  - createMemoryDatabaseAdapter
  - createNodeSqliteAdapter
  - createQueryBuilder
  - createSqlDriverAdapter
  - getLocale
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

