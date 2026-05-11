---
fileId: contextrail-template:modules:retrieval:ports:tokenizer-port
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: outbound
boundedContext: retrieval
summary: Tokenizer port contract for the retrieval module.
owns: The Tokenizer port interface definition for the retrieval module.
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
specRefs: TPL-104
portCategory: ai-pipeline
contractTests: tests/contract/retrieval-hex-contract.test.mjs
linkedDocs: modules/retrieval/ports/README.md
---

# tokenizer-port.mjs
