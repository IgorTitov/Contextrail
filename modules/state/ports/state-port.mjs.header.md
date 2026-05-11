---
fileId: contextrail-template:modules:state:ports:state-port
module: modules/state
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: state
summary: State port contract for the state module.
owns: The State port interface definition for the state module.
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
specRefs: TPL-048
portCategory: storage
contractTests: tests/contract/state-hex-contract.test.mjs
linkedDocs: modules/state/ports/README.md
---

# state-port.mjs
