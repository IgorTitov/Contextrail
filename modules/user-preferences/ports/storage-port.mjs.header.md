---
fileId: contextrail-template:modules:user-preferences:ports:storage-port
module: modules/user-preferences
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: user-preferences
summary: Storage port contract for the user-preferences module.
owns: The Storage port interface definition for the user-preferences module.
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
specRefs: TPL-029
portCategory: storage
contractTests: tests/contract/user-preferences-hex-contract.test.mjs
linkedDocs: modules/user-preferences/ports/README.md
---

# storage-port.mjs
