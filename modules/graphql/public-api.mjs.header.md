---
fileId: contextrail-template:modules:graphql:public-api
module: modules/graphql
stability: experimental
steward: graphql-module
api: PublicAPI
boundedContext: graphql
summary: Single cross-module entry point for the graphql module — re-exports domain, port, adapters, messages.
owns: The public surface of the graphql module.
boundaries: The only file other modules may import from graphql/. Deep imports are forbidden.
invariants: Every export here must be intentionally public. Internal helpers must not leak.
specRefs:
  - TPL-001
exports:
  - assertGraphqlTransportPort
  - createMemoryGraphqlTransport
  - createSchema
  - executeQuery
  - getLocale
  - isBuiltinScalar
  - parseQuery
  - registerLocale
  - resetLocale
  - setLocale
  - stripTypeDecoration
  - t
---

# public-api.mjs
