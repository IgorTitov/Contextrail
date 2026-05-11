---
fileId: contextrail-template:modules:scheduler:domain:jitter
module: modules/scheduler
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: scheduler
summary: Adds bounded random jitter to a scheduling interval, clamping the result to a minimum of 1 ms.
owns: addJitter function that applies a symmetric random offset within the given jitter range to a base interval.
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

# jitter.mjs
