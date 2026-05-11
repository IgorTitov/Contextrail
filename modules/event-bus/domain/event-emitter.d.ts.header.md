---
fileId: contextrail-template:modules:event-bus:domain:event-emitter.d
module: modules/event-bus
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: event-bus
summary: Event Emitter.D implementation for the event-bus module.
owns: Event Emitter.D implementation within the event-bus module.
boundaries: Scoped to the event-bus module. Do not use outside this module boundary.
invariants: Must remain consistent with the event-bus module's port contracts.
notesForLLM: Part of the event-bus module. Access through public-api.mjs from outside the module.
allowedDependencies:
  - ./
  - "../ports/*"
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - next
  - electron
  - express
  - fastify
  - vite
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
linkedDocs: modules/event-bus/domain/README.md
---

# event-emitter.d.ts
