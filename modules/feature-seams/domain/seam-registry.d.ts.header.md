---
fileId: contextrail-template:modules:feature-seams:domain:seam-registry.d
module: modules/feature-seams
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: feature-seams
summary: Seam Registry.D implementation for the feature-seams module.
owns: Seam Registry.D implementation within the feature-seams module.
boundaries: Scoped to the feature-seams module. Do not use outside this module boundary.
invariants: Must remain consistent with the feature-seams module's port contracts.
notesForLLM: Part of the feature-seams module. Access through public-api.mjs from outside the module.
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
linkedDocs: modules/feature-seams/domain/README.md
---

# seam-registry.d.ts
