---
fileId: contextrail-template:modules:graphql:domain:executor
module: modules/graphql
stability: experimental
steward: graphql-module
api: Domain
boundedContext: graphql
summary: Pure GraphQL executor walking a parsed query against a schema with error aggregation.
owns: executeQuery.
boundaries: Pure walker. No transport, no I/O. Resolvers may be sync or async; executor awaits all results.
invariants: Resolver throws become ExecutionErrors with the field path, never propagate out of executeQuery. Data for failed fields is null.
specRefs:
  - TPL-001
---

# executor.mjs
