---
fileId: contextrail-template:modules:onboarding:domain:tour-state
module: modules/onboarding
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: onboarding
summary: Immutable state machine for onboarding tours that tracks ordered steps, current index, and active/inactive status through pure transitions.
owns: createTourState, start, next, previous, and stop transition functions that return new TourState objects without mutation.
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
linkedDocs: modules/onboarding/domain/README.md
---

# tour-state.mjs
