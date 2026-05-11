---
fileId: contextrail-template:modules:analytics:domain:consent
module: modules/analytics
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: analytics
summary: Privacy-first consent checks for analytics and behavioral tracking categories.
owns: Category consent check, Do Not Track detection, and default consent state factory (everything off by default).
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

# consent.mjs
