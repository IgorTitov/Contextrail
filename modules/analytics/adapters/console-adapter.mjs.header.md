---
fileId: contextrail-template:modules:analytics:adapters:console-adapter
module: modules/analytics
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: analytics
summary: Console sink adapter for the analytics module. Writes through console.log/warn/error.
owns: The Console adapter implementation for the analytics module.
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
specRefs: TPL-164
linkedDocs: modules/analytics/adapters/README.md
implementsPort: analytics-port
runtimeEnvironment: universal
externalSystems:
  - console
---

# console-adapter.mjs
