---
fileId: contextrail-template:modules:tenancy:memory-tenant-store
module: modules/tenancy
stability: experimental
steward: tenancy-module
api: Adapter
boundedContext: tenancy
summary: In-memory Map-backed TenantStorePort adapter — validates via createTenant, returns defensive copies.
owns: createMemoryTenantStore.
boundaries: No network, no filesystem. All state lives in a closure-local Map.
invariants: Every input is validated through the pure domain createTenant. Duplicate ids are rejected. Returned tenants are defensive copies — mutation cannot leak back into the store.
notesForLLM: The clock option is reserved for future createdAt stamping; currently unused.
specRefs:
  - TPL-001
---

# memory-tenant-store.mjs
