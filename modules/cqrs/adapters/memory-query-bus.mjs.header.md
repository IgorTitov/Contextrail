---
fileId: contextrail-template:modules:cqrs:memory-query-bus
module: modules/cqrs
stability: experimental
steward: cqrs-module
api: Adapter
boundedContext: cqrs
summary: In-memory QueryBusPort adapter — Map-backed handler registry for read-side dispatch.
owns: createMemoryQueryBus.
boundaries: No network, no filesystem. All state lives in closure-local Maps.
invariants: Every query is validated through the pure domain createQuery. Duplicate handler registrations are rejected. Handler context carries { now } only — no event store by convention.
notesForLLM: nextId counter resets on clear() so tests stay deterministic.
specRefs:
  - TPL-001
---

# memory-query-bus.mjs
