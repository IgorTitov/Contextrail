---
fileId: contextrail-template:modules:tenancy:tenant
module: modules/tenancy
stability: experimental
steward: tenancy-module
api: Domain
boundedContext: tenancy
summary: Pure Tenant value object — slug-like id, optional name, flat string metadata.
owns: createTenant, the Tenant typedef, and the slug-id regex.
boundaries: Stays inside the tenancy bounded context. No I/O, no imports from adapters/.
invariants: Ids always match /^[a-z0-9][a-z0-9-]{0,63}$/. Metadata is a flat string map.
notesForLLM: Validation errors throw TypeError with i18n keys from messages.mjs.
specRefs:
  - TPL-001
---

# tenant.mjs
