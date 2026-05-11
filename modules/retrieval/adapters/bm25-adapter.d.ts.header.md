---
fileId: contextrail-template:modules:retrieval:adapters:bm25-adapter.d
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
adapterType: secondary
boundedContext: retrieval
owns: TypeScript declaration for createBm25Adapter, mirroring bm25-adapter.mjs exports.
boundaries: Must stay in sync with bm25-adapter.mjs exports; must not add logic.
invariants: Must export createBm25Adapter with the same signature as types.d.ts.
risks: Signature drift from bm25-adapter.mjs silently breaks TypeScript consumers.
notesForLLM: Pair with a vector adapter inside a hybrid retriever for best recall + precision. Pure lexical on its own misses semantic matches.
tests: _n/a_
specRefs: TPL-089
related:
  - modules/retrieval/adapters/bm25-adapter.mjs
  - modules/retrieval/types.d.ts
summary: BM25 sparse retrieval adapter for the retrieval module. Lexical scoring over an in-memory index.
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

# bm25-adapter.d.ts
