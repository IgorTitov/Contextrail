---
fileId: contextrail-template:modules:tenancy:public-api
module: modules/tenancy
stability: experimental
steward: tenancy-module
api: PublicAPI
boundedContext: tenancy
summary: Single cross-module entry point for the tenancy module — re-exports domain, port, adapters, messages.
owns: The public surface of the tenancy module.
boundaries: The only file other modules may import from tenancy/. Deep imports are forbidden.
invariants: Every export here must be intentionally public. Internal helpers must not leak.
notesForLLM: When adding a new export, update manifest.json capabilities and the README usage examples.
specRefs:
  - TPL-001
exports:
  - assertTenantStorePort
  - createAlsTenantContext
  - createMemoryTenantStore
  - createTenant
  - createTenantContext
  - getLocale
  - registerLocale
  - requireTenant
  - resetLocale
  - resolveTenantFromHeaders
  - resolveTenantFromSubdomain
  - setLocale
  - t
  - withTenant
---

# public-api.mjs
