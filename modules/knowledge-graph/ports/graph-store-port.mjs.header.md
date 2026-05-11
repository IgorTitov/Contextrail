---
fileId: contextrail-template:modules:knowledge-graph:ports:graph-store-port
module: modules/knowledge-graph
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: outbound
boundedContext: knowledge-graph
summary: Graph Store port contract for the knowledge-graph module.
owns: The Graph Store port interface definition for the knowledge-graph module.
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
specRefs: TPL-115
portCategory: storage
contractTests: tests/contract/knowledge-graph-hex-contract.test.mjs
linkedDocs: modules/knowledge-graph/ports/README.md
---

# graph-store-port.mjs
