---
fileId: contextrail-template:tests:unit:graphql
module: tests/unit
stability: experimental
steward: graphql-module
api: Tests
boundedContext: graphql
summary: Unit proof for the graphql module — schema, parser subset, executor, port, memory transport.
owns: Unit coverage of the graphql domain, port assertion, and in-memory transport adapter.
boundaries: Tests import only from modules/graphql/public-api.mjs. No deep imports.
invariants: Tests must fail when any listed behavior regresses. Subset limits (fragments, variables, directives) must stay enforced.
specRefs:
  - TPL-001
---

# graphql.test.mjs
