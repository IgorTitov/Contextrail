---
fileId: contextrail-template:modules:i18n:domain:interpolation
module: modules/i18n
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: i18n
summary: Replaces {placeholder} tokens in a template string with values from a params object.
owns: Pure string interpolation via Object.entries reduce over {key} patterns.
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
linkedDocs: modules/i18n/domain/README.md
---

# interpolation.mjs
