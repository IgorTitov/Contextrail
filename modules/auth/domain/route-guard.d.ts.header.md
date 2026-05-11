---
fileId: contextrail-template:modules:auth:domain:route-guard.d
module: modules/auth
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: auth
summary: Route Guard.D implementation for the auth module.
owns: Route Guard.D implementation within the auth module.
boundaries: Scoped to the auth module. Do not use outside this module boundary.
invariants: Must remain consistent with the auth module's port contracts.
notesForLLM: Part of the auth module. Access through public-api.mjs from outside the module.
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
linkedDocs: modules/auth/domain/README.md
---

# route-guard.d.ts
