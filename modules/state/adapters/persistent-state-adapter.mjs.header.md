---
fileId: contextrail-template:modules:state:adapters:persistent-state-adapter
module: modules/state
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: state
summary: Persistent state adapter for the state module. Durable state store.
owns: The Persistent State adapter implementation for the state module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use when state state must survive restarts. Pair with a memory adapter in tests for speed.
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
specRefs: TPL-050
linkedDocs: modules/state/adapters/README.md
implementsPort: state-port
runtimeEnvironment: universal
---

# persistent-state-adapter.mjs
