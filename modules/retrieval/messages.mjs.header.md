---
fileId: contextrail-template:modules:retrieval:messages
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
boundedContext: retrieval
owns: Bounded i18n locale store for all retrieval module error strings; t(), setLocale(), getLocale(), registerLocale(), and resetLocale() functions; canonical key namespace retrieval.error.*.
boundaries: Must not import from adapters or ports. Must not grow beyond module-internal error message needs. Must not be shared with any app-level messages layer.
invariants: All user-facing strings produced by port assertions and adapters must go through t() rather than hardcoded literals; resetLocale() must restore 'en'; t() must return the key string for unknown keys rather than throwing.
risks: Removing or renaming a key without updating the port or adapter that references it causes silent key-passthrough at runtime; the regression is hard to detect because the wrong string is returned rather than an error.
notesForLLM: "Key namespace is retrieval.error.*. Current keys: port_not_object, port_missing_method (used by assertRetrievalPort); embedding_missing, embedding_dimension, query_embedding_required, query_embedding_dimension (used by vector adapter); chunker_port_not_object, chunker_port_missing_chunk (used by assertChunkerPort). The port_missing_method key supports {method} interpolation."
tests:
  - tests/unit/retrieval.test.mjs
  - tests/unit/retrieval-chunker-port.test.mjs
linkedDocs: docs/prd/retrieval.md
specRefs:
  - TPL-087
  - TPL-098
related:
  - modules/retrieval/ports/retrieval-port.mjs
  - modules/retrieval/ports/chunker-port.mjs
  - modules/retrieval/adapters/bm25-adapter.mjs
  - modules/retrieval/adapters/vector-local-adapter.mjs
summary: i18n message registry for the retrieval module.
messageKeys:
  - retrieval.error.port_not_object
  - retrieval.error.port_missing_method
  - retrieval.error.embedding_missing
  - retrieval.error.embedding_dimension
  - retrieval.error.query_embedding_required
  - retrieval.error.query_embedding_dimension
  - retrieval.error.chunker_port_not_object
  - retrieval.error.chunker_port_missing_chunk
  - retrieval.error.tokenizer_port_not_object
  - retrieval.error.tokenizer_port_missing_method
  - retrieval.error.embedder_port_not_object
  - retrieval.error.embedder_port_missing_embed
  - retrieval.error.reranker_port_not_object
  - retrieval.error.reranker_port_missing_rerank
  - retrieval.error.loader_port_not_object
  - retrieval.error.loader_port_missing_load
  - retrieval.error.transformer_port_not_object
  - retrieval.error.transformer_port_missing_transform
---

# messages.mjs
