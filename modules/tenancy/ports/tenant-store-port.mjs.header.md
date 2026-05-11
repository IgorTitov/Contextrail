---
fileId: contextrail-template:modules:tenancy:tenant-store-port
module: modules/tenancy
stability: experimental
steward: tenancy-module
api: Port
boundedContext: tenancy
summary: TenantStorePort contract + runtime assertTenantStorePort validator.
owns: TenantStorePort typedef, TenantInput typedef, assertTenantStorePort.
boundaries: Describes the contract only. Implementations live in ../adapters/.
invariants: The REQUIRED method list matches the typedef. Adding a method here requires updating every adapter.
notesForLLM: Keep the port narrow — cross-module consumers should not depend on adapter internals.
specRefs:
  - TPL-001
---

# tenant-store-port.mjs
