---
name: Slices 13-17 - RAG Extensions
description: TPL-097 epic with TPL-098 through TPL-128 tasks across five slices extending retrieval with pluggable chunking, tokenizer/embedder ports, hybrid search, knowledge-graph module, and document loaders
type: project
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Agent working memory for Slices 13-17, recording the five-slice RAG extension decomposition, per-slice TPL ID ranges, and last assigned ID for the retrieval and knowledge-graph epic.
@sidecar project_slices13_17_rag_extensions.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

Slices 13-17 extend the retrieval infrastructure and add a new knowledge-graph hex module.

**Why:** The existing retrieval module (Slice 11) provides the foundation but lacks pluggable chunking, token-aware budgeting, hybrid search, graph-based RAG, and document ingestion. These extensions make the RAG infrastructure production-grade and extensible for diverse document formats and search strategies.

**How to apply:** Epic TPL-097 spans five slices. Slice 13 (TPL-098-103): ChunkerPort contract with character, recursive-character, sentence, and markdown adapters in the retrieval module. Slice 14 (TPL-104-109): TokenizerPort and EmbedderPort in retrieval, plus token-aware augmentPrompt integration. Slice 15 (TPL-110-113): HybridSearchAdapter (RRF), WeightedHybridAdapter, ReRankerPort, ScoreThreshold reranker in retrieval. Slice 16 (TPL-114-121): New standalone `modules/knowledge-graph/` hex module with Entity/Relationship types, GraphStorePort + memory adapter, entity/relationship extractors (regex/co-occurrence), BFS traversal, Union-Find community detection. Slice 17 (TPL-122-128): DocumentLoaderPort with plain/markdown/HTML loaders, QueryTransformerPort with passthrough/multi-query adapters, consolidated public API update. All technical/architectural -- no USM. PRD at docs/prd/rag-extensions.md, backlog at docs/backlog/rag-extensions.md. Last ID: TPL-128. Created 2026-03-29.
