---
fileId: contextrail-template:modules:rate-limit:public-api
module: modules/rate-limit
stability: evolving
steward: shared
api: "Public API"
boundedContext: rate-limit
summary: Single cross-module entry point for the rate-limit module.
owns: Single cross-module entry point for the rate-limit module.
boundaries: Stays inside the rate-limit bounded context. Do not couple to other modules' internals.
invariants: Bounded to the ${name} module.
notesForLLM: Only this file may be imported from other modules. Do not deep-import into domain/, ports/, or adapters/.
specRefs:
  - TPL-001
exports:
  - assertRateLimiterPort
  - consume
  - createBucketState
  - createMemoryRateLimiter
  - getLocale
  - refill
  - registerLocale
  - resetLocale
  - setLocale
  - t
  - validateBucketConfig
---

# public-api.mjs
