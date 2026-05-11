---
fileId: contextrail-template:modules:permission:domain:role-hierarchy
module: modules/permission
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: permission
summary: Resolves the flattened set of effective roles for a given role by traversing a parent-inheritance config map with cycle detection.
owns: createRoleHierarchy factory with resolveRoles method that performs BFS over the role inheritance graph using a visited set.
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

# role-hierarchy.mjs
