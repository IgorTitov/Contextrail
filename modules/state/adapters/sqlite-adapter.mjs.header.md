---
fileId: contextrail-template:modules:state:adapters:sqlite-adapter
module: modules/state
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: state
summary: SQLite-backed adapter for the state module. File-backed durable persistence without a separate server.
owns: The Sqlite adapter implementation for the state module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use for durable single-node persistence. Not suitable for multi-process writes without extra coordination.
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
adapterType: storage
linkedDocs: modules/state/adapters/README.md
implementsPort: state-port
transport: db/sql
runtimeEnvironment: universal
---

# sqlite-adapter.mjs
