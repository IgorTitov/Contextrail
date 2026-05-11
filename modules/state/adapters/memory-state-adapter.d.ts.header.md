---
fileId: contextrail-template:modules:state:adapters:memory-state-adapter.d
module: modules/state
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: state
summary: Memory state adapter for the state module. Ephemeral in-process store.
owns: Memory State Adapter.D adapter within the state module.
boundaries: Scoped to the state module. Do not use outside this module boundary.
invariants: Must remain consistent with the state module's port contracts.
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
linkedDocs: modules/state/adapters/README.md
---

# memory-state-adapter.d.ts
