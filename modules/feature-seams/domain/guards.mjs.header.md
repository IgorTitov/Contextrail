---
fileId: contextrail-template:modules:feature-seams:domain:guards
module: modules/feature-seams
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: feature-seams
summary: Branching helpers that route code paths based on seam-port enabled/disabled state.
owns: whenEnabled() two-branch dispatcher and ifEnabled() conditional-action guard for feature seam flags.
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

# guards.mjs
