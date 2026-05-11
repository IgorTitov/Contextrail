---
fileId: contextrail-template:modules:cqrs:command-bus-port
module: modules/cqrs
stability: experimental
steward: cqrs-module
api: Port
boundedContext: cqrs
summary: CommandBusPort contract + runtime assertCommandBusPort validator.
owns: CommandBusPort typedef, assertCommandBusPort.
boundaries: Describes the contract only. Implementations live in ../adapters/.
invariants: The REQUIRED method list matches the typedef. Adding a method here requires updating every adapter.
notesForLLM: Keep the port narrow — three methods (register, dispatch, clear).
specRefs:
  - TPL-001
---

# command-bus-port.mjs
