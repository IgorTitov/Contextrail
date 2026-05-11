---
fileId: contextrail-template:modules:cqrs:public-api
module: modules/cqrs
stability: experimental
steward: cqrs-module
api: PublicAPI
boundedContext: cqrs
summary: Single cross-module entry point for the cqrs module — re-exports domain, ports, adapters, messages.
owns: The public surface of the cqrs module.
boundaries: The only file other modules may import from cqrs/. Deep imports are forbidden.
invariants: Every export here must be intentionally public. Internal helpers must not leak.
notesForLLM: When adding a new export, update manifest.json capabilities and the README usage examples.
specRefs:
  - TPL-001
exports:
  - assertCommandBusPort
  - assertEventStorePort
  - assertQueryBusPort
  - createAggregate
  - createCommand
  - createEvent
  - createMemoryCommandBus
  - createMemoryEventStore
  - createMemoryQueryBus
  - createQuery
  - getLocale
  - registerLocale
  - replayAggregate
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs
