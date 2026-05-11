---
fileId: contextrail-template:modules:realtime:domain:transport-manager
module: modules/realtime
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: realtime
summary: Composes multiple TransportPort instances into a single RealtimePort with automatic transport selection, ordered fallback, reconnection, and heartbeat.
owns: createTransportManager factory; transport fallback ordering and wiring; connection state machine orchestration; auto-reconnect lifecycle; channel router integration.
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
specRefs: TPL-153
linkedDocs: modules/realtime/domain/README.md
---

# transport-manager.mjs
