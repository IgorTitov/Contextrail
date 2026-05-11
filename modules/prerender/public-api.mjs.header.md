---
fileId: contextrail-template:modules:prerender:public-api
module: modules/prerender
stability: experimental
steward: prerender-module
api: PublicAPI
boundedContext: prerender
summary: Single cross-module entry point for the prerender module — re-exports domain, ports, adapters, messages.
owns: The public surface of the prerender module.
boundaries: The only file other modules may import from prerender/. Deep imports are forbidden.
invariants: Every export here must be intentionally public. Internal helpers must not leak.
specRefs:
  - TPL-001
exports:
  - assertRenderFunction
  - assertStaticOutputPort
  - createMemoryStaticOutput
  - createPrerenderPlan
  - createRenderResult
  - createRouteManifest
  - createSequentialPrerenderRunner
  - getLocale
  - isRouteManifest
  - planToTargets
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs
