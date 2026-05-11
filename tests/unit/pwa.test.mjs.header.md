---
fileId: contextrail-template:tests:unit:pwa
module: tests/unit
stability: experimental
steward: pwa-module
api: Test
boundedContext: pwa
summary: Unit proof for the pwa bounded module — manifest, cache strategies, service worker source, port, memory adapter.
owns: Behavioral proof for pwa public-api exports.
boundaries: Imports from modules/pwa/public-api.mjs only — never from domain/, ports/, or adapters/ directly.
invariants: Must import only through the public API. Must not touch browser globals or the filesystem.
specRefs:
  - TPL-001
---

# pwa.test.mjs
