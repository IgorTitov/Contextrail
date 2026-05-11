---
fileId: contextrail-template:modules:prerender:domain:prerender-plan
module: modules/prerender
stability: experimental
steward: prerender-module
api: Domain
boundedContext: prerender
summary: Pure prerender plan — binds a route manifest to an absolute base URL and projects render targets.
owns: createPrerenderPlan and planToTargets.
boundaries: Pure value object. Does not know how routes are rendered or where output lands.
invariants: baseUrl must be an absolute http(s) URL with no path, query, or hash. Manifest must come from createRouteManifest.
specRefs:
  - TPL-001
---

# prerender-plan.mjs
