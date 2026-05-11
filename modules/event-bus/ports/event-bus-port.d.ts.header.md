---
fileId: contextrail-template:modules:event-bus:ports:event-bus-port.d
module: modules/event-bus
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: event-bus
summary: Event Bus Port.D port for the event-bus module.
owns: Event Bus Port.D port within the event-bus module.
boundaries: Scoped to the event-bus module. Do not use outside this module boundary.
invariants: Must remain consistent with the event-bus module's port contracts.
notesForLLM: Part of the event-bus module. Access through public-api.mjs from outside the module.
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
portCategory: messaging
contractTests: tests/contract/event-bus-hex-contract.test.mjs
linkedDocs: modules/event-bus/ports/README.md
---

# event-bus-port.d.ts
