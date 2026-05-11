---
fileId: contextrail-template:modules:seo:seo-publisher-port
module: modules/seo
stability: experimental
steward: seo-module
api: Port
boundedContext: seo
summary: Port contract and runtime assertion for adapters that publish SEO assets (sitemap, robots, meta snippets).
owns: SeoPublisherPort typedef, SeoAssetRecord typedef, assertSeoPublisherPort.
boundaries: Contract definition only. No implementation, no I/O.
invariants: assertSeoPublisherPort must fail fast on any missing method. The typedef is the single source of truth for capabilities-sync.
specRefs:
  - TPL-001
---

# seo-publisher-port.mjs
