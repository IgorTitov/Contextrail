---
fileId: contextrail-template:modules:graphql:domain:query-parser
module: modules/graphql
stability: experimental
steward: graphql-module
api: Domain
boundedContext: graphql
summary: Minimal recursive-descent GraphQL query parser covering a closed, documented subset.
owns: parseQuery.
boundaries: Pure parser — no schema validation, no execution. Rejects fragments, variables, directives with subset-specific errors.
invariants: The supported subset is documented in README.md and must not silently grow. Every unsupported construct must fail fast with a clear message.
specRefs:
  - TPL-001
---

# query-parser.mjs
