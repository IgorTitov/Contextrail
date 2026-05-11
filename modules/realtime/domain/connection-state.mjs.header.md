---
fileId: contextrail-template:modules:realtime:domain:connection-state
module: modules/realtime
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: realtime
summary: Finite state machine enforcing valid transitions between connection states (disconnected, connecting, connected, reconnecting, failed) with change listeners.
owns: createConnectionStateMachine factory; ConnectionStates enum; VALID_TRANSITIONS map; transition validation with error on illegal moves; state-change listener registration.
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
linkedDocs: modules/realtime/domain/README.md
---

# connection-state.mjs
