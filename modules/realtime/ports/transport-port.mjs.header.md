---
fileId: contextrail-template:modules:realtime:ports:transport-port
module: modules/realtime
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: outbound
boundedContext: realtime
summary: Transport port contract for the realtime module.
owns: The Transport port interface definition for the realtime module.
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
specRefs: TPL-148
portCategory: network
contractTests: tests/contract/realtime-hex-contract.test.mjs
linkedDocs: modules/realtime/ports/README.md
---

# transport-port.mjs
