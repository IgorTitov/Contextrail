---
fileId: contextrail-template:modules:seo:meta-tags
module: modules/seo
stability: experimental
steward: seo-module
api: Domain
boundedContext: seo
summary: Pure validator and renderer for HTML meta tag descriptors with XSS-safe attribute escaping.
owns: createMetaTags, renderMetaTagsHtml, escapeAttribute.
boundaries: Pure string functions. No DOM, no browser globals.
invariants: User-supplied titles and descriptions cannot break out of HTML attributes — escapeAttribute must neutralize &, <, >, ", and apostrophe. Descriptors are frozen.
specRefs:
  - TPL-001
---

# meta-tags.mjs
