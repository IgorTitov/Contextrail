---
fileId: contextrail-template:modules:retrieval:adapters:README
module: modules/retrieval
stability: evolving
steward: shared
api: Documentation
hexLayer: adapter
boundedContext: retrieval
dependsOn:
  - modules/retrieval/adapters/bm25-adapter.mjs
  - modules/retrieval/adapters/vector-local-adapter.mjs
owns: "Human-readable orientation for the adapters layer: which adapters exist, their retrieval strategy, and key constraints."
boundaries: Must not duplicate implementation details already clear from individual adapter file headers.
invariants: Must stay aligned with the adapters actually present in this directory.
risks: Stale descriptions mislead agents about the embedding requirement for the vector adapter or the stop-word behavior of the BM25 tokenizer.
notesForLLM: Both adapters satisfy the RetrievalPort contract and are pure in-memory implementations with no external dependencies. BM25 tokenizes with stop-word removal. Vector adapter requires pre-computed embeddings passed in document metadata — it does NOT embed text itself.
tests: _n/a_
linkedDocs: docs/prd/retrieval.md
specRefs:
  - TPL-089
  - TPL-090
related:
  - modules/retrieval/adapters/bm25-adapter.mjs
  - modules/retrieval/adapters/vector-local-adapter.mjs
summary: Directory overview for the adapters layer of the retrieval module.
---

# README.md
