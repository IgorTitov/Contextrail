---
fileId: contextrail-template:modules:db:adapters:sql-driver-adapter
module: modules/db
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: db
summary: SQL driver adapter for the db module. Executes SQL through an injected driver.
owns: The Sql Driver adapter implementation for the db module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: "Driver-agnostic surface. The concrete driver (sqlite, postgres, mysql) is injected — keep SQL dialect concerns isolated here."
allowedDependencies:
  - "../ports/*"
  - "../types.*"
  - ./
  - "frameworks as needed (react, express, node: builtins)"
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: infrastructure
linkedDocs: modules/db/adapters/README.md
implementsPort: database-port
transport: db/sql
runtimeEnvironment: universal
---

# sql-driver-adapter.mjs
