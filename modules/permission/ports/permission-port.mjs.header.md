---
fileId: contextrail-template:modules:permission:ports:permission-port
module: modules/permission
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: permission
summary: Permission port contract for the permission module.
owns: The Permission port interface definition for the permission module.
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
specRefs: TPL-157
portCategory: credential
contractTests: tests/contract/permission-hex-contract.test.mjs
linkedDocs: modules/permission/ports/README.md
---

# permission-port.mjs
