---
fileId: contextrail-template:modules:db:domain:query-builder
module: modules/db
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: db
summary: Fluent SQL query builder that chains select/where/orderBy/limit/offset and produces {sql, params} pairs.
owns: createQueryBuilder() factory with chainable clause methods and a build() that outputs parameterized SQL strings.
boundaries: Pure domain logic. No infrastructure dependencies allowed.
invariants: Must remain framework-free and testable in isolation.
allowedDependencies:
  - ./
  - "../ports/*"
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - next
  - electron
  - express
  - fastify
  - vite
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
linkedDocs: modules/db/domain/README.md
---

# query-builder.mjs
