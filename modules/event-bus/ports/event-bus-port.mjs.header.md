---
fileId: contextrail-template:modules:event-bus:ports:event-bus-port
module: modules/event-bus
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: event-bus
summary: Event Bus port contract for the event-bus module.
owns: The Event Bus port interface definition for the event-bus module.
boundaries: Port interface only. No implementation details or infrastructure code.
invariants: Must define and export a contract assertion function.
notesForLLM: Port contract. Adapters in adapters/ must satisfy this interface.
allowedDependencies:
  - ./
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - express
  - fastify
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
specRefs: TPL-044
portCategory: messaging
contractTests: tests/contract/event-bus-hex-contract.test.mjs
linkedDocs: modules/event-bus/ports/README.md
---

# event-bus-port.mjs
