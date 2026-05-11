---
fileId: contextrail-template:modules:pwa:cache-strategy
module: modules/pwa
stability: experimental
steward: pwa-module
api: Domain
boundedContext: pwa
summary: Cache strategy descriptor factory — cacheFirst, networkFirst, staleWhileRevalidate, networkOnly, cacheOnly.
owns: createCacheStrategy plus the five named factories.
boundaries: Pure descriptors. This file does not touch the Cache API or Fetch — it only validates shape.
invariants: type must be one of the five supported strategies. cacheName is required and non-empty. maxEntries/maxAgeSeconds, if set, are positive integers.
specRefs:
  - TPL-001
---

# cache-strategy.mjs
