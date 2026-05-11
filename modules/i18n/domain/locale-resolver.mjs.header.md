---
fileId: contextrail-template:modules:i18n:domain:locale-resolver
module: modules/i18n
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: i18n
summary: Builds a BCP 47 locale fallback chain by progressively stripping subtags until a match or default is reached.
owns: buildFallbackChain function that produces an ordered list of locale tags to try during message resolution.
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

# locale-resolver.mjs
