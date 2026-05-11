---
fileId: contextrail-template:modules:realtime:domain:heartbeat
module: modules/realtime
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: realtime
summary: Ping/pong heartbeat monitor that sends periodic keep-alive pings and fires a timeout callback if no pong is received within the configured window.
owns: createHeartbeat factory; periodic ping interval scheduling; pong-timeout detection; timer lifecycle (start, stop, receivedPong).
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

# heartbeat.mjs
