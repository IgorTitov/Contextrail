---
fileId: contextrail-template:modules:log:adapters:console-adapter
module: modules/log
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: log
summary: Console sink adapter for the log module. Writes through console.log/warn/error.
owns: The Console adapter implementation for the log module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use in development. In production prefer a structured or remote sink for parseable output.
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
adapterType: logging
specRefs: TPL-138
linkedDocs: modules/log/adapters/README.md
implementsPort: log-port
runtimeEnvironment: universal
externalSystems:
  - console
---

# console-adapter.mjs
