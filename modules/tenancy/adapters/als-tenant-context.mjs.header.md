---
fileId: contextrail-template:modules:tenancy:als-tenant-context
module: modules/tenancy
stability: experimental
steward: tenancy-module
api: Adapter
boundedContext: tenancy
summary: AsyncLocalStorage-backed tenant scope helper — run(tenant, fn) + current() + require().
owns: createAlsTenantContext, the AlsTenantContext typedef.
boundaries: The ONLY file in the tenancy module allowed to import node:async_hooks.
invariants: Domain code must never import from this file — the import direction is adapter → domain, never the reverse.
notesForLLM: Use this at the request boundary to bind a tenant once and let downstream async code read it without ctx threading.
specRefs:
  - TPL-001
---

# als-tenant-context.mjs
