---
fileId: contextrail-template:modules:cqrs:aggregate
module: modules/cqrs
stability: experimental
steward: cqrs-module
api: Domain
boundedContext: cqrs
summary: Pure event-sourcing aggregate helper — fold events into state and track pending changes.
owns: createAggregate, replayAggregate, the Aggregate typedef.
boundaries: Stays inside the cqrs bounded context. No I/O, no imports from adapters/.
invariants: createAggregate tracks pending uncommitted events and increments version on apply. replayAggregate is a pure fold.
notesForLLM: Reducer signature is (state, event) => newState. Keep it stateless.
specRefs:
  - TPL-001
---

# aggregate.mjs
