---
fileId: contextrail-template:tests:unit:seo
module: tests/unit
stability: experimental
steward: seo-module
api: Test
boundedContext: seo
summary: Unit proof for the seo bounded module — meta tags, sitemap, robots, port, memory adapter.
owns: Behavioral proof for seo public-api exports.
boundaries: Imports from modules/seo/public-api.mjs only — never from domain/, ports/, or adapters/ directly.
invariants: Must import only through the public API. Must prove that XSS-style title injection is neutralized.
specRefs:
  - TPL-001
---

# seo.test.mjs
