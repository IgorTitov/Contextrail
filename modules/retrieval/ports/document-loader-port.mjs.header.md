---
fileId: contextrail-template:modules:retrieval:ports:document-loader-port
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: outbound
boundedContext: retrieval
summary: Document Loader port contract for the retrieval module.
owns: The Document Loader port interface definition for the retrieval module.
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
specRefs: TPL-122
portCategory: ai-pipeline
contractTests: tests/contract/retrieval-hex-contract.test.mjs
linkedDocs: modules/retrieval/ports/README.md
---

# document-loader-port.mjs
