---
fileId: contextrail-template:tests:unit:cache-storage-adapters.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Prove the storage-backed cache adapters — LocalStorage (with namespace + JSON degradation), Redis (with mock client, write-through, and TTL), and IndexedDB (factory shape only in Node).
owns: Unit proof of createLocalStorageCacheAdapter (namespace isolation, JSON parse error degradation, missing-localStorage degradation), createRedisCacheAdapter (write-through, TTL via pexpire, defaultTtl, sync, eviction), and createIndexedDBCacheAdapter (factory shape, returns Promise).
boundaries: Must import only through modules/cache/public-api.mjs. Tests use mocked localStorage and a mock Redis client; never touch real storage. Port + domain + memory adapter live in cache.test.mjs.
invariants: localStorage clear must scope to namespace; Redis pexpire must receive TTL in milliseconds; IndexedDB factory must return a Promise even without IndexedDB available (graceful degradation).
risks: Forgetting to restore globalThis.localStorage in the missing-localStorage degradation test would poison subsequent tests in this file.
notesForLLM: Use a shared mockClient stub from beforeEach for Redis tests. The IndexedDB tests are deliberately minimal in Node — full IndexedDB behavior must be covered in browser-side BDD instead.
tests: node --test tests/unit/cache-storage-adapters.test.mjs
related: tests/unit/cache.test.mjs; tests/contract/cache-hex-contract.test.mjs
specRefs:
  - TPL-143
  - TPL-144
  - TPL-145
  - TPL-218
---

# cache-storage-adapters.test.mjs
