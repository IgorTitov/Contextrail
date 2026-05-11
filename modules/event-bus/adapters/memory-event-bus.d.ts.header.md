---
fileId: contextrail-template:modules:event-bus:adapters:memory-event-bus.d
module: modules/event-bus
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: event-bus
summary: Memory Event Bus.D implementation for the event-bus module.
owns: Memory Event Bus.D implementation within the event-bus module.
boundaries: Scoped to the event-bus module. Do not use outside this module boundary.
invariants: Must remain consistent with the event-bus module's port contracts.
notesForLLM: Part of the event-bus module. Access through public-api.mjs from outside the module.
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
linkedDocs: modules/event-bus/adapters/README.md
---

# memory-event-bus.d.ts
