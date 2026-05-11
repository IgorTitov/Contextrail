---
fileId: contextrail-template:apps:api-starter:routes:seo
module: apps/api-starter
stability: experimental
steward: api-starter
api: Route
boundedContext: api-starter
summary: HTTP route handlers that expose the seo module's sitemap.xml, robots.txt, and /api/seo/meta via the api-starter.
owns: seoSitemapHandler, seoRobotsHandler, seoMetaHandler.
boundaries: Thin wiring only — domain logic stays in modules/seo. Returns raw responses via the RAW_RESPONSE symbol.
invariants: Sitemap and robots are served as application/xml and text/plain. Meta lookups are scoped to the small in-process META_PAGES registry.
specRefs:
  - TPL-001
---

# seo.mjs
