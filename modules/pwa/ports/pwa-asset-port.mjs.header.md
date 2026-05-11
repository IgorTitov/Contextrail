---
fileId: contextrail-template:modules:pwa:pwa-asset-port
module: modules/pwa
stability: experimental
steward: pwa-module
api: Port
boundedContext: pwa
summary: Port contract and runtime assertion for adapters that persist PWA assets (manifest, service worker).
owns: PwaAssetPort typedef, PwaAssetRecord typedef, assertPwaAssetPort.
boundaries: Contract definition only. No implementation, no I/O.
invariants: assertPwaAssetPort must fail fast on any missing method. The typedef is the single source of truth for capabilities-sync.
specRefs:
  - TPL-001
---

# pwa-asset-port.mjs
