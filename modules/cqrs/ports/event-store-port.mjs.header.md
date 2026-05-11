---
fileId: contextrail-template:modules:cqrs:event-store-port
module: modules/cqrs
stability: experimental
steward: cqrs-module
api: Port
boundedContext: cqrs
summary: EventStorePort contract + runtime assertEventStorePort validator.
owns: EventStorePort typedef, EventStoreFilter typedef, EventStoreListener typedef, assertEventStorePort.
boundaries: Describes the contract only. Implementations live in ../adapters/.
invariants: append enforces optimistic concurrency via expectedVersion. Stamped events carry id, sequence, recordedAt.
notesForLLM: Subscriber exceptions must be swallowed by adapters — a broken listener cannot corrupt the append path.
specRefs:
  - TPL-001
---

# event-store-port.mjs
