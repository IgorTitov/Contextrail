---
fileId: contextrail-template:modules:state:adapters:memory-state-adapter
module: modules/state
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: state
summary: Memory state adapter for the state module. Ephemeral in-process store.
owns: The Memory State adapter implementation for the state module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use for tests and short-lived processes. Not durable; state is lost on restart.
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
specRefs: TPL-049
linkedDocs: modules/state/adapters/README.md
implementsPort: state-port
runtimeEnvironment: universal
---

# memory-state-adapter.mjs
