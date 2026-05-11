---
fileId: contextrail-template:modules:prerender:domain:route-manifest
module: modules/prerender
stability: experimental
steward: prerender-module
api: Domain
boundedContext: prerender
summary: Pure route manifest value object — validated, frozen list of prerender routes.
owns: createRouteManifest and isRouteManifest.
boundaries: Pure value object. No transport, no I/O.
invariants: Every path must start with / and be unique within the manifest. Returned manifest is frozen.
specRefs:
  - TPL-001
---

# route-manifest.mjs
