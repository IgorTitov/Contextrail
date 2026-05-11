---
fileId: contextrail-template:modules:retrieval:ports:chunker-port.d
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: outbound
boundedContext: retrieval
owns: TypeScript declaration for assertChunkerPort, kept in sync with chunker-port.mjs exports.
boundaries: Must not contain runtime logic. Must stay in exact sync with chunker-port.mjs; must not declare types that belong in types.d.ts.
invariants: The assertChunkerPort signature must match the runtime function exactly; any signature change in chunker-port.mjs must be reflected here immediately.
risks: Signature drift from chunker-port.mjs silently breaks TypeScript consumers that rely on this declaration.
notesForLLM: This is the .d.ts type sidecar for chunker-port.mjs. Update only when chunker-port.mjs exports change. ChunkerPort interface lives in types.d.ts.
tests: _n/a_
specRefs: TPL-098
related:
  - modules/retrieval/ports/chunker-port.mjs
  - modules/retrieval/types.d.ts
  - modules/retrieval/public-api.d.ts
summary: Chunker Port.D port for the retrieval module.
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

# chunker-port.d.ts
