---
fileId: contextrail-template:modules:prerender:domain:render-result
module: modules/prerender
stability: experimental
steward: prerender-module
api: Domain
boundedContext: prerender
summary: Pure render-result value object — validated envelope for one rendered route.
owns: createRenderResult.
boundaries: Pure value object. No transport, no I/O.
invariants: html must be a string, status defaults to 200 and must be an integer 100..599, headers is a flat string map.
specRefs:
  - TPL-001
---

# render-result.mjs
