---
fileId: contextrail-template:modules:cache:domain:cache-utils
module: modules/cache
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: cache
summary: TTL expiration check and LRU access-order tracker for cache entries.
owns: isExpired() TTL check and createLruTracker() with touch/evict/remove operations.
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
linkedDocs: modules/cache/domain/README.md
---

# cache-utils.mjs
