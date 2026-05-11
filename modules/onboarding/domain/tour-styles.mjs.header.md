---
fileId: contextrail-template:modules:onboarding:domain:tour-styles
module: modules/onboarding
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: onboarding
summary: Generates CSS text for the onboarding spotlight overlay, backdrop, popover, and navigation buttons from configurable color, radius, and z-index options.
owns: buildTourStylesheet function that returns injectable CSS for __onboarding-backdrop, __onboarding-spotlight, and __onboarding-popover classes.
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

# tour-styles.mjs
