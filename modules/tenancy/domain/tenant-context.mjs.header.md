---
fileId: contextrail-template:modules:tenancy:tenant-context
module: modules/tenancy
stability: experimental
steward: tenancy-module
api: Domain
boundedContext: tenancy
summary: Pure { tenant } context shape with createTenantContext, requireTenant, withTenant helpers.
owns: TenantContext typedef, createTenantContext, requireTenant, withTenant.
boundaries: Framework-free. Does not depend on node:async_hooks — that lives in adapters/als-tenant-context.mjs.
invariants: withTenant never mutates the input context; requireTenant throws when tenant is null.
notesForLLM: Use this helper when you need tenant scoping in browser or test code where ALS is not available.
specRefs:
  - TPL-001
---

# tenant-context.mjs
