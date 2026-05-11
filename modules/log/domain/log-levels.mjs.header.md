---
fileId: contextrail-template:modules:log:domain:log-levels
module: modules/log
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: log
summary: Defines numeric priority map (debug/info/warn/error) and shouldLog threshold comparison.
owns: LOG_LEVEL_PRIORITY constant and shouldLog() minimum-level gate.
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
linkedDocs: modules/log/domain/README.md
---

# log-levels.mjs
