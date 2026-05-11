---
fileId: contextrail-template:modules:seo:public-api
module: modules/seo
stability: experimental
steward: seo-module
api: PublicAPI
boundedContext: seo
summary: Single cross-module entry point for the seo module — re-exports domain, port, adapters, messages.
owns: The public surface of the seo module.
boundaries: The only file other modules may import from seo/. Deep imports are forbidden.
invariants: Every export here must be intentionally public. Internal helpers must not leak.
specRefs:
  - TPL-001
exports:
  - assertSeoPublisherPort
  - createMemorySeoPublisher
  - createMetaTags
  - createRobotsTxt
  - createSitemap
  - escapeAttribute
  - escapeXml
  - getLocale
  - registerLocale
  - renderMetaTagsHtml
  - renderRobotsTxt
  - renderSitemapXml
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs
