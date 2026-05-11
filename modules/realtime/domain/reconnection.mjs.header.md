---
fileId: contextrail-template:modules:realtime:domain:reconnection
module: modules/realtime
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: realtime
summary: Exponential-backoff reconnection strategy with configurable jitter, multiplier, maxDelay, and maxAttempts for realtime transport recovery.
owns: createReconnectionStrategy factory; attempt counter; nextDelay calculation with exponential backoff and optional jitter; reset logic.
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

# reconnection.mjs
