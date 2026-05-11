---
fileId: contextrail-template:modules:cqrs:event
module: modules/cqrs
stability: experimental
steward: cqrs-module
api: Domain
boundedContext: cqrs
summary: Pure DomainEvent value object — validated Aggregate.Verbed type + aggregateId + payload.
owns: createEvent, the DomainEvent typedef, and the type-shape regex.
boundaries: Stays inside the cqrs bounded context. No I/O, no imports from adapters/.
invariants: Type matches /^[A-Z][A-Za-z0-9]*\.[A-Z][A-Za-z0-9]*$/ (PascalCase.PascalCase). aggregateId is a non-empty string.
notesForLLM: id, sequence, and recordedAt are stamped by the EventStore adapter, not here.
specRefs:
  - TPL-001
---

# event.mjs
