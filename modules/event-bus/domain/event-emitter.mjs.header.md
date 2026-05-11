---
fileId: contextrail-template:modules:event-bus:domain:event-emitter
module: modules/event-bus
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: event-bus
summary: In-memory Map-backed event emitter with on/off/emit, listener counting, and clear.
owns: createEventEmitter() factory producing the core EventBusCore object (subscribe, unsubscribe, emit, listenerCount, clear).
boundaries: Pure domain logic. No infrastructure dependencies allowed.
invariants: Must remain framework-free and testable in isolation.
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

# event-emitter.mjs
