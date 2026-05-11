---
fileId: contextrail-template:modules:graphql:domain:query-tokens
module: modules/graphql
stability: experimental
steward: graphql-module
api: Domain
boundedContext: graphql
summary: Low-level character scanners (names, scalars, keywords, whitespace, unsupported-syntax rejection) shared by the GraphQL query parser.
owns: readScalarValue, readString, readNumber, readName, matchKeyword, skipWhitespace, rejectUnsupported.
boundaries: Pure cursor-driven scanners — no AST construction, no schema awareness. Composed by query-parser.mjs into the structural parser.
invariants: Every scanner advances the shared ScanState in place. Unsupported GraphQL constructs (fragments, variables, directives) must fail with a subset-specific message rather than a generic syntax error.
specRefs:
  - TPL-001
---

# query-tokens.mjs
