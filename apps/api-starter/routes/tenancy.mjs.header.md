---
fileId: contextrail-template:apps:api-starter:routes:tenancy
module: apps/api-starter/routes
stability: experimental
steward: tenancy-module
api: Route
boundedContext: tenancy
summary: HTTP route handlers that wire the tenancy public API into the api-starter server.
owns: createTenantHandler, getTenantHandler, listTenantsHandler.
boundaries: Uses only ctx.tenancy (a TenantStorePort). No deep imports into modules/tenancy/.
invariants: Every handler signature matches the (req, ctx) shape used by the rest of the router.
notesForLLM: Add new routes alongside the tenancy module exports, not in the main app.mjs body.
specRefs:
  - TPL-001
---

# tenancy.mjs
