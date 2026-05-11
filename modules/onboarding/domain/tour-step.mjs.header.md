---
fileId: contextrail-template:modules:onboarding:domain:tour-step
module: modules/onboarding
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: onboarding
summary: Factory for tour step value objects with target selector, title, description, popover position, and display order.
owns: createTourStep factory, TourStep and PopoverPosition type definitions, and auto-incrementing step ID generation.
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

# tour-step.mjs
