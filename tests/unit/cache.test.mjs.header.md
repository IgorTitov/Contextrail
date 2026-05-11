---
fileId: contextrail-template:tests:unit:cache.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the cache module — port contract, isExpired domain helper, LRU tracker, and the in-memory LRU adapter.
owns: Unit proof of assertCachePort, isExpired, createLruTracker, and createMemoryLruAdapter (TTL, eviction, defaultTtl).
boundaries: Must import only through modules/cache/public-api.mjs. Storage-backed adapters (LocalStorage, Redis, IndexedDB) live in cache-storage-adapters.test.mjs.
invariants: All imports must go through public-api.mjs; assertCachePort must throw on any adapter missing required methods (get, set, delete, has, clear, size, keys); LRU eviction logic must be exercised in isolation without real storage.
notesForLLM: Import exclusively via public-api.mjs. Use the Date.now override pattern for TTL tests; restore in finally. Memory-adapter tests should never depend on real wall-clock time.
tests: node --test tests/unit/cache.test.mjs
related: tests/unit/cache-storage-adapters.test.mjs; tests/contract/cache-hex-contract.test.mjs
specRefs:
  - TPL-142
  - TPL-143
  - TPL-144
  - TPL-145
  - TPL-218
---

# cache.test.mjs
