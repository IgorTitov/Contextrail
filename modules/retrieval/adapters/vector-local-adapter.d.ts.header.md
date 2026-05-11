---
fileId: contextrail-template:modules:retrieval:adapters:vector-local-adapter.d
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
adapterType: secondary
boundedContext: retrieval
owns: TypeScript declaration for createVectorLocalAdapter, mirroring vector-local-adapter.mjs exports.
boundaries: Must stay in sync with vector-local-adapter.mjs exports; must not add logic.
invariants: Must export createVectorLocalAdapter with the same signature as types.d.ts.
risks: Signature drift from vector-local-adapter.mjs silently breaks TypeScript consumers.
notesForLLM: Use when the corpus fits in memory. Swap for a remote vector DB adapter when scaling beyond single-node memory.
tests: _n/a_
specRefs: TPL-090
related:
  - modules/retrieval/adapters/vector-local-adapter.mjs
  - modules/retrieval/types.d.ts
summary: In-process vector index adapter for the retrieval module. Cosine-similarity lookup over locally stored embeddings.
allowedDependencies:
  - "../ports/*"
  - "../types.*"
  - ./
  - "frameworks as needed (react, express, node: builtins)"
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
linkedDocs: modules/retrieval/adapters/README.md
---

# vector-local-adapter.d.ts
