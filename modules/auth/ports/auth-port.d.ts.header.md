---
fileId: contextrail-template:modules:auth:ports:auth-port.d
module: modules/auth
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: auth
summary: Auth Port.D port for the auth module.
owns: Auth Port.D port within the auth module.
boundaries: Scoped to the auth module. Do not use outside this module boundary.
invariants: Must remain consistent with the auth module's port contracts.
notesForLLM: Part of the auth module. Access through public-api.mjs from outside the module.
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
portCategory: credential
contractTests: tests/contract/auth-hex-contract.test.mjs
linkedDocs: modules/auth/ports/README.md
---

# auth-port.d.ts
