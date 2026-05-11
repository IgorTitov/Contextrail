---
fileId: contextrail-template:modules:knowledge-graph:adapters:memory-graph-adapter
module: modules/knowledge-graph
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: knowledge-graph
summary: In-memory graph adapter for the knowledge-graph module. Nodes and edges held in-process.
owns: The Memory Graph adapter implementation for the knowledge-graph module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use for tests and small graphs. Not durable; swap for a real graph DB adapter at scale.
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
adapterType: in-memory
linkedDocs: modules/knowledge-graph/adapters/README.md
implementsPort: graph-store-port
runtimeEnvironment: universal
---

# memory-graph-adapter.mjs
