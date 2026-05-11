---
fileId: contextrail-template:tests:unit:tenancy
module: tests/unit
stability: experimental
steward: tenancy-module
api: Test
boundedContext: tenancy
summary: Unit proof for the tenancy bounded module — tenant value object, context helpers, resolvers, port assertion, memory store, ALS context.
owns: Behavioral coverage of every public-api.mjs export from modules/tenancy.
boundaries: Imports only from modules/tenancy/public-api.mjs — no deep imports.
invariants: Every branch of createTenant, both resolvers, the memory store, and the ALS scope is exercised.
notesForLLM: Adding a new public-api export requires a new describe block here.
specRefs:
  - TPL-001
---

# tenancy.test.mjs
