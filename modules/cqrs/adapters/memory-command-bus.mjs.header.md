---
fileId: contextrail-template:modules:cqrs:memory-command-bus
module: modules/cqrs
stability: experimental
steward: cqrs-module
api: Adapter
boundedContext: cqrs
summary: In-memory CommandBusPort adapter — Map-backed handler registry with id/createdAt stamping.
owns: createMemoryCommandBus.
boundaries: No network, no filesystem. All state lives in closure-local Maps.
invariants: Every command is validated through the pure domain createCommand. Duplicate handler registrations are rejected. Handler context carries { now, eventStore? }.
notesForLLM: nextId counter resets on clear() so tests stay deterministic.
specRefs:
  - TPL-001
---

# memory-command-bus.mjs
