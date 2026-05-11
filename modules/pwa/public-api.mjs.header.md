---
fileId: contextrail-template:modules:pwa:public-api
module: modules/pwa
stability: experimental
steward: pwa-module
api: PublicAPI
boundedContext: pwa
summary: Single cross-module entry point for the pwa module — re-exports domain, port, adapters, messages.
owns: The public surface of the pwa module.
boundaries: The only file other modules may import from pwa/. Deep imports are forbidden.
invariants: Every export here must be intentionally public. Internal helpers must not leak.
specRefs:
  - TPL-001
exports:
  - assertPwaAssetPort
  - cacheFirst
  - cacheOnly
  - createCacheStrategy
  - createMemoryPwaAssetStore
  - createWebManifest
  - generateServiceWorkerSource
  - getLocale
  - networkFirst
  - networkOnly
  - registerLocale
  - resetLocale
  - setLocale
  - staleWhileRevalidate
  - t
  - webManifestToJson
---

# public-api.mjs
