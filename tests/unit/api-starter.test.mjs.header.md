---
fileId: contextrail-template:tests:unit:api-starter.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: apps/api-starter/app.mjs
summary: Unit tests for the api-starter app shell covering context creation, server lifecycle, routing, and middleware.
owns: Unit-level proof for api-starter app context, server, router, and middleware.
boundaries: Tests api-starter internals only. HTTP behavior is covered in BDD.
invariants: Must cover createAppContext and startServer exports.
securityPrivacy: No secrets.
notesForLLM: Unit tests for api-starter. For HTTP behavior tests, see the BDD layer.
tests: self
specRefs: TPL-177
related: tests/bdd/api-starter.test.mjs
---

# api-starter.test.mjs
