---
fileId: contextrail-template:modules:retrieval:adapters:bm25-adapter
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
adapterType: secondary
boundedContext: retrieval
dependsOn: modules/retrieval/messages.mjs
owns: BM25 retrieval adapter satisfying RetrievalPort; inverted index and per-document TF maps; English stop-word list; score normalization from raw BM25 to 0-1 range; per-instance document store.
boundaries: Must not make network calls or use browser storage APIs. Must not be imported directly by app code — accessible only through modules/retrieval/public-api.mjs. Must not implement embedding or semantic search.
invariants: Must satisfy every method required by RetrievalPort (addDocuments, search, removeDocuments, clear); scores returned must be normalized to [0, 1]; each createBm25Adapter call must produce an isolated in-memory instance; avgDl must be recalculated after every addDocuments or removeDocuments call.
risks: Module-level idCounter is not reset between test runs — tests must not rely on exact generated id values; stop-word list is English-only and silently degrades retrieval quality for non-English text; score normalization divides by maxScore, which produces 0 for all results when maxScore is 0.
notesForLLM: Pair with a vector adapter inside a hybrid retriever for best recall + precision. Pure lexical on its own misses semantic matches.
tests:
  - tests/unit/retrieval.test.mjs
  - tests/contract/retrieval-hex-contract.test.mjs
linkedDocs: docs/prd/retrieval.md
specRefs: TPL-089
related:
  - modules/retrieval/ports/retrieval-port.mjs
  - modules/retrieval/adapters/vector-local-adapter.mjs
  - modules/retrieval/public-api.mjs
allowedDependencies: modules/retrieval/messages.mjs
summary: BM25 sparse retrieval adapter for the retrieval module. Lexical scoring over an in-memory index.
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
implementsPort: retrieval-port
runtimeEnvironment: universal
---

# bm25-adapter.mjs
