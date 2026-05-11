---
fileId: contextrail-template:modules:graphql:adapters:memory-graphql-transport
module: modules/graphql
stability: experimental
steward: graphql-module
api: Adapter
boundedContext: graphql
summary: In-memory GraphqlTransportPort adapter wrapping the pure parser + executor for tests, dev, and the api-starter demo.
owns: createMemoryGraphqlTransport.
boundaries: In-memory only. No network. Parse errors and execution errors both surface via the canonical { data, errors } shape.
invariants: Parse failures must not throw out of handleQuery — they are captured into result.errors with an empty path.
specRefs:
  - TPL-001
---

# memory-graphql-transport.mjs
