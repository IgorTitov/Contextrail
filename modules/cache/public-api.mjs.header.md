---
fileId: contextrail-template:modules:cache:public-api
module: modules/cache
stability: evolving
steward: shared
api: module-public
hexLayer: application
boundedContext: cache
dependsOn:
  - modules/cache/ports/cache-port.mjs
  - modules/cache/domain/cache-utils.mjs
  - modules/cache/adapters/memory-lru-adapter.mjs
  - modules/cache/adapters/local-storage-adapter.mjs
  - modules/cache/adapters/indexeddb-adapter.mjs
summary: Public API facade for the cache module — re-exports port assertion, TTL/LRU utilities, and adapter factories.
owns: The single cross-module entry point for the cache bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/cache.test.mjs
  - tests/contract/cache-hex-contract.test.mjs
  - tests/bdd/cache.test.mjs
specRefs:
  - TPL-001
linkedDocs:
  - modules/cache/README.md
  - docs/_generated/dependency-graph.json
allowedDependencies:
  - "./domain/*"
  - "./application/*"
  - "./ports/*"
  - "./adapters/*"
  - "./messages.*"
  - "./types.*"
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/ports/**"
  - "modules/<other>/adapters/**"
  - react
  - express
  - fastify
  - "node:*"
exports:
  - assertCachePort
  - createIndexedDBCacheAdapter
  - createLocalStorageCacheAdapter
  - createLruTracker
  - createMemoryLruAdapter
  - createRedisCacheAdapter
  - getLocale
  - isExpired
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

