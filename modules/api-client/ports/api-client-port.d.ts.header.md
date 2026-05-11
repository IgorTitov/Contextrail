---
fileId: contextrail-template:modules:api-client:ports:api-client-port.d
module: modules/api-client
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: api-client
summary: Api Client Port.D port for the api-client module.
owns: Api Client Port.D port within the api-client module.
boundaries: Scoped to the api-client module. Do not use outside this module boundary.
invariants: Must remain consistent with the api-client module's port contracts.
notesForLLM: Part of the api-client module. Access through public-api.mjs from outside the module.
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
portCategory: network
contractTests: tests/contract/api-client-hex-contract.test.mjs
linkedDocs: modules/api-client/ports/README.md
---

# api-client-port.d.ts
