---
fileId: contextrail-template:modules:pwa:service-worker-source
module: modules/pwa
stability: experimental
steward: pwa-module
api: Domain
boundedContext: pwa
summary: Pure string generator for a service worker script — install, activate, fetch with precache and runtime rules.
owns: generateServiceWorkerSource.
boundaries: Emits a JavaScript source string only. Does not register or execute the worker. No eval, no new Function.
invariants: Emitted source only uses standard ServiceWorkerGlobalScope APIs (self, caches, fetch, Response). Cache key is ${cacheName}-${version}. All five strategy implementations are always included.
specRefs:
  - TPL-001
---

# service-worker-source.mjs
