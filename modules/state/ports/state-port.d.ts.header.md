---
fileId: contextrail-template:modules:state:ports:state-port.d
module: modules/state
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: state
summary: State Port.D port for the state module.
owns: State Port.D port within the state module.
boundaries: Scoped to the state module. Do not use outside this module boundary.
invariants: Must remain consistent with the state module's port contracts.
notesForLLM: Part of the state module. Access through public-api.mjs from outside the module.
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
portCategory: storage
contractTests: tests/contract/state-hex-contract.test.mjs
linkedDocs: modules/state/ports/README.md
---

# state-port.d.ts
