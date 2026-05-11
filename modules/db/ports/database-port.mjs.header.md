---
fileId: contextrail-template:modules:db:ports:database-port
module: modules/db
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: db
summary: Database port contract for the db module.
owns: The Database port interface definition for the db module.
boundaries: Port interface only. No implementation details or infrastructure code.
invariants: Must define and export a contract assertion function.
notesForLLM: Port contract. Adapters in adapters/ must satisfy this interface.
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
contractTests: tests/contract/db-hex-contract.test.mjs
linkedDocs: modules/db/ports/README.md
---

# database-port.mjs
