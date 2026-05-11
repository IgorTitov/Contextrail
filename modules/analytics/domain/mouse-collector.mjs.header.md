---
fileId: contextrail-template:modules:analytics:domain:mouse-collector
module: modules/analytics
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: analytics
summary: Samples mouse position at configurable intervals, batches samples, and flushes them for heatmap data collection.
owns: Throttled mouse-move sampling, batch accumulation with configurable size, and flush callback dispatch.
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
specRefs: TPL-167
linkedDocs: modules/analytics/domain/README.md
---

# mouse-collector.mjs
