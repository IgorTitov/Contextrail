---
fileId: contextrail-template:modules:cqrs:memory-event-store
module: modules/cqrs
stability: experimental
steward: cqrs-module
api: Adapter
boundedContext: cqrs
summary: In-memory EventStorePort adapter — stream-per-aggregate + optimistic concurrency + subscribers.
owns: createMemoryEventStore.
boundaries: No network, no filesystem. All state lives in closure-local Maps and arrays.
invariants: append enforces expectedVersion equals current stream length. Stamps id/sequence/recordedAt. Listener exceptions are swallowed.
notesForLLM: nextId and state reset on clear(). loadAll supports { aggregateId, type } filters.
specRefs:
  - TPL-001
---

# memory-event-store.mjs
