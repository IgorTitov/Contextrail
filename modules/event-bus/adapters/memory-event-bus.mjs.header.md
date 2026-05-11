---
fileId: contextrail-template:modules:event-bus:adapters:memory-event-bus
module: modules/event-bus
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: event-bus
summary: "In-process memory adapter for the event-bus module. Ephemeral, lost on restart."
owns: The Memory Event Bus adapter implementation for the event-bus module.
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
specRefs: TPL-045
linkedDocs: modules/event-bus/adapters/README.md
---

# memory-event-bus.mjs
