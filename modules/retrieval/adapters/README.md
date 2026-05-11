<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Describe the adapters layer of the retrieval module, which provides two RetrievalPort implementations: BM25 keyword-based and vector cosine-similarity search.
@sidecar README.md.header.md
@layer module | @hex adapter | @ctx retrieval
@public false
@edit careful -->

# adapters

RetrievalPort adapter implementations.

- `bm25-adapter.mjs` -- keyword-based TF-IDF retrieval using BM25 scoring
- `vector-local-adapter.mjs` -- cosine similarity search over pre-computed embeddings
