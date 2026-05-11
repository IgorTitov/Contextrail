---
fileId: contextrail-template:modules:file:ports:file-port
module: modules/file
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: file
summary: File port contract for the file module.
owns: The File port interface definition for the file module.
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
specRefs: TPL-160
portCategory: storage
contractTests: tests/contract/file-hex-contract.test.mjs
linkedDocs: modules/file/ports/README.md
---

# file-port.mjs
