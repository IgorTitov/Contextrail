---
fileId: contextrail-template:modules:feature-seams:ports:seam-port.d
module: modules/feature-seams
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: feature-seams
summary: Seam Port.D port for the feature-seams module.
owns: Seam Port.D port within the feature-seams module.
boundaries: Scoped to the feature-seams module. Do not use outside this module boundary.
invariants: Must remain consistent with the feature-seams module's port contracts.
notesForLLM: Part of the feature-seams module. Access through public-api.mjs from outside the module.
allowedDependencies:
  - ./
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - express
  - fastify
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
portCategory: infrastructure
contractTests: tests/contract/feature-seams-hex-contract.test.mjs
linkedDocs: modules/feature-seams/ports/README.md
---

# seam-port.d.ts
