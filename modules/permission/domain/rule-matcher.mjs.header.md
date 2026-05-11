---
fileId: contextrail-template:modules:permission:domain:rule-matcher
module: modules/permission
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: permission
summary: Matches a permission rule against an action/resource pair with optional condition constraints, supporting wildcard '*' for both action and resource.
owns: matchRule function with exact-match and wildcard logic plus shallow-equality condition checking.
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
linkedDocs: modules/permission/domain/README.md
---

# rule-matcher.mjs
