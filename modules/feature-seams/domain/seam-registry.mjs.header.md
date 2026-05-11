---
fileId: contextrail-template:modules:feature-seams:domain:seam-registry
module: modules/feature-seams
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: feature-seams
summary: In-memory registry for feature seams with active/shadow/disabled states and register/enable/disable/list/remove operations.
owns: SEAM_STATES enum and createSeamRegistry() factory managing named feature flags with state validation and ownership tracking.
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
linkedDocs: modules/feature-seams/domain/README.md
---

# seam-registry.mjs
