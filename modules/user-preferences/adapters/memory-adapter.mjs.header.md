---
fileId: contextrail-template:modules:user-preferences:adapters:memory-adapter
module: modules/user-preferences
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: user-preferences
summary: "In-process memory adapter for the user-preferences module. Ephemeral, lost on restart."
owns: The Memory adapter implementation for the user-preferences module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use for tests and single-node dev where durability is not required. Prefer a persistent sibling adapter in production.
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
linkedDocs: modules/user-preferences/adapters/README.md
implementsPort: storage-port
runtimeEnvironment: universal
---

# memory-adapter.mjs
