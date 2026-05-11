---
fileId: contextrail-template:modules:state:adapters:persistent-state-adapter.d
module: modules/state
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: state
summary: Persistent state adapter for the state module. Durable state store.
owns: Persistent State Adapter.D adapter within the state module.
boundaries: Scoped to the state module. Do not use outside this module boundary.
invariants: Must remain consistent with the state module's port contracts.
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
linkedDocs: modules/state/adapters/README.md
---

# persistent-state-adapter.d.ts
