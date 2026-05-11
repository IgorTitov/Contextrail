---
fileId: contextrail-template:modules:graphql:ports:graphql-transport-port
module: modules/graphql
stability: experimental
steward: graphql-module
api: Port
boundedContext: graphql
summary: GraphqlTransportPort contract + assertGraphqlTransportPort validator.
owns: The transport port contract (handleQuery) for parse + execute + format.
boundaries: Port declaration only. No implementation — adapters live in adapters/.
invariants: Adapters must implement handleQuery. Assertion rejects null/non-object and missing method.
specRefs:
  - TPL-001
---

# graphql-transport-port.mjs
