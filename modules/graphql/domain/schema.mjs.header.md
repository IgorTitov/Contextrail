---
fileId: contextrail-template:modules:graphql:domain:schema
module: modules/graphql
stability: experimental
steward: graphql-module
api: Domain
boundedContext: graphql
summary: Pure GraphQL schema value object with type/field/resolver validation and cross-reference checks.
owns: createSchema, stripTypeDecoration, isBuiltinScalar.
boundaries: Pure value object. No transport, no execution, no I/O.
invariants: Every field type must resolve to a declared type or a built-in scalar. Returned schema is frozen.
specRefs:
  - TPL-001
---

# schema.mjs
