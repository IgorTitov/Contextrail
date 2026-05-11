---
fileId: contextrail-template:modules:scheduler:domain:cron-parser
module: modules/scheduler
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: scheduler
summary: Parses human-friendly interval expressions like "every 5m" or "every 30s" into milliseconds, with raw-number passthrough.
owns: parseCronLike function, UNIT_MS conversion table (s/m/h/d), and CRON_LIKE_RE regex pattern.
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
linkedDocs: modules/scheduler/domain/README.md
---

# cron-parser.mjs
