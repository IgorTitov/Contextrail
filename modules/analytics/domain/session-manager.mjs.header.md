---
fileId: contextrail-template:modules:analytics:domain:session-manager
module: modules/analytics
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: analytics
summary: Creates analytics session trackers with configurable timeout, UUID generation, and optional sessionStorage persistence.
owns: Session ID generation, timeout-based session lifecycle, and sessionStorage save/restore for analytics sessions.
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
linkedDocs: modules/analytics/domain/README.md
---

# session-manager.mjs
