---
fileId: contextrail-template:apps:api-starter:routes:graphql
module: apps/api-starter
stability: experimental
steward: api-starter
api: Route
boundedContext: graphql
summary: GraphQL demo route — execute a query against an in-process sample schema via the graphql module's memory transport.
owns: /api/graphql handler and the demo schema wired behind it.
boundaries: Imports only from modules/graphql/public-api.mjs. No deep imports.
invariants: Every query flows through the GraphqlTransportPort — the route never parses or executes directly.
specRefs:
  - TPL-001
---

# graphql.mjs
