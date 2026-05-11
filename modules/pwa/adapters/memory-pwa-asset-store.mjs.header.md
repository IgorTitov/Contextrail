---
fileId: contextrail-template:modules:pwa:memory-pwa-asset-store
module: modules/pwa
stability: experimental
steward: pwa-module
api: Adapter
boundedContext: pwa
summary: In-memory Map-backed PwaAssetPort adapter — stores manifest JSON and service worker source with defensive copies.
owns: createMemoryPwaAssetStore.
boundaries: No network, no filesystem. All state lives in a closure-local Map.
invariants: Empty service worker source is rejected. listAssets returns fresh copies — mutation cannot leak back into the store. writtenAt comes from the injectable clock, defaulting to Date.now.
specRefs:
  - TPL-001
---

# memory-pwa-asset-store.mjs
