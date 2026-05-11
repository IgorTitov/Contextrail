---
fileId: contextrail-template:modules:seo:sitemap
module: modules/seo
stability: experimental
steward: seo-module
api: Domain
boundedContext: seo
summary: Pure validator and XML emitter for sitemaps.org urlsets.
owns: createSitemap, renderSitemapXml, escapeXml.
boundaries: Pure string functions. No I/O.
invariants: loc values must be absolute http(s) URLs. lastmod must be ISO date or datetime. changefreq must match the sitemaps.org enum. priority must be in [0,1]. XML entities in loc are always escaped.
specRefs:
  - TPL-001
---

# sitemap.mjs
