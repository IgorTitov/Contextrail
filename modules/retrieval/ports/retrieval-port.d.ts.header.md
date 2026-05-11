---
fileId: contextrail-template:modules:retrieval:ports:retrieval-port.d
module: modules/retrieval
stability: evolving
steward: shared
api: module-public
hexLayer: port
portType: inbound
boundedContext: retrieval
owns: TypeScript declaration for assertRetrievalPort, mirroring retrieval-port.mjs exports.
boundaries: Must stay in sync with retrieval-port.mjs exports; must not add logic.
invariants: Must export assertRetrievalPort with the same signature as types.d.ts.
risks: Signature drift from retrieval-port.mjs silently removes TypeScript type safety for port consumers.
notesForLLM: This is the .d.ts sidecar for retrieval-port.mjs. Update only when retrieval-port.mjs exports change.
tests: _n/a_
specRefs: TPL-087
related:
  - modules/retrieval/ports/retrieval-port.mjs
  - modules/retrieval/types.d.ts
summary: Retrieval Port.D port for the retrieval module.
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
portCategory: ai-pipeline
contractTests: tests/contract/retrieval-hex-contract.test.mjs
linkedDocs: modules/retrieval/ports/README.md
---

# retrieval-port.d.ts
