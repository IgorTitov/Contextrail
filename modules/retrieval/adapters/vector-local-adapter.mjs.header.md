---
fileId: contextrail-template:modules:retrieval:adapters:vector-local-adapter
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
adapterType: secondary
boundedContext: retrieval
dependsOn: modules/retrieval/messages.mjs
owns: Cosine similarity vector retrieval adapter satisfying RetrievalPort; per-instance in-memory embedding store; dimension consistency enforcement; pre-computed embedding extraction from document metadata; cosineSimilarity function.
boundaries: Must not perform text embedding — only accepts pre-computed embeddings provided via document.metadata.embedding. Must not make network calls or use browser storage APIs. Must not be imported directly by app code — accessible only through modules/retrieval/public-api.mjs.
invariants: Must satisfy every method required by RetrievalPort; all documents in a single adapter instance must use embeddings of the same dimension — dimension is inferred from the first document added; search() must throw TypeError when options.queryEmbedding is absent; cosine similarity must be clamped to [0, 1]; dimension resets to null after clear() or when store is empty.
risks: Module-level idCounter is not reset between test runs — tests must not rely on exact generated id values; supplying embeddings of mixed dimension across adapter instances causes no cross-contamination but confuses callers who share documents; negative cosine values are silently clamped to 0 rather than raising an error.
notesForLLM: Use when the corpus fits in memory. Swap for a remote vector DB adapter when scaling beyond single-node memory.
tests:
  - tests/unit/retrieval.test.mjs
  - tests/contract/retrieval-hex-contract.test.mjs
linkedDocs: docs/prd/retrieval.md
specRefs: TPL-090
related:
  - modules/retrieval/ports/retrieval-port.mjs
  - modules/retrieval/adapters/bm25-adapter.mjs
  - modules/retrieval/public-api.mjs
allowedDependencies: modules/retrieval/messages.mjs
summary: In-process vector index adapter for the retrieval module. Cosine-similarity lookup over locally stored embeddings.
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
implementsPort: retrieval-port
runtimeEnvironment: universal
---

# vector-local-adapter.mjs
