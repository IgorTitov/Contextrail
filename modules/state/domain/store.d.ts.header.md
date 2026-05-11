---
fileId: contextrail-template:modules:state:domain:store.d
module: modules/state
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: state
summary: Store.D implementation for the state module.
owns: Store.D implementation within the state module.
boundaries: Scoped to the state module. Do not use outside this module boundary.
invariants: Must remain consistent with the state module's port contracts.
notesForLLM: Part of the state module. Access through public-api.mjs from outside the module.
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
linkedDocs: modules/state/domain/README.md
---

# store.d.ts
