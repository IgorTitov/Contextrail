---
fileId: contextrail-template:modules:seo:robots
module: modules/seo
stability: experimental
steward: seo-module
api: Domain
boundedContext: seo
summary: Pure validator and text emitter for robots.txt files under the Robots Exclusion Standard.
owns: createRobotsTxt, renderRobotsTxt.
boundaries: Pure string functions. No I/O.
invariants: Each rule requires a userAgent. Sitemap URLs must be absolute http(s). Output preserves rule order so first-match semantics are predictable.
specRefs:
  - TPL-001
---

# robots.mjs
