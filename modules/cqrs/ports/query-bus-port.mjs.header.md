---
fileId: contextrail-template:modules:cqrs:query-bus-port
module: modules/cqrs
stability: experimental
steward: cqrs-module
api: Port
boundedContext: cqrs
summary: QueryBusPort contract + runtime assertQueryBusPort validator.
owns: QueryBusPort typedef, assertQueryBusPort.
boundaries: Describes the contract only. Implementations live in ../adapters/.
invariants: The REQUIRED method list matches the typedef. Adding a method here requires updating every adapter.
notesForLLM: Query handlers must be side-effect free — they read from projections, not the write log.
specRefs:
  - TPL-001
---

# query-bus-port.mjs
