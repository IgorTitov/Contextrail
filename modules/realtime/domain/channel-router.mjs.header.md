---
fileId: contextrail-template:modules:realtime:domain:channel-router
module: modules/realtime
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: realtime
summary: Channel-based pub/sub message routing — dispatches incoming messages to channel subscribers and forwards connection state changes.
owns: Channel subscription registry, message parsing and dispatch, connection state change notification.
boundaries: Pure domain logic only; must not depend on transport implementations or external APIs.
invariants: Subscribers receive only messages for their subscribed channel; unsubscribed callbacks are never called.
notesForLLM: Internal domain helper for transport-manager.mjs; not exported through public-api.mjs.
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

# channel-router.mjs
