---
name: Slice 11 - RAG Retrieval Module
description: TPL-086 epic with TPL-087 through TPL-092 tasks for retrieval hex module providing in-browser RAG with BM25, vector cosine similarity, chunker, and augmentPrompt pipeline
type: project
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Product-planner memory record for the Slice 11 RAG Retrieval epic and its task decomposition.
@sidecar project_slice11_retrieval.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

Slice 11 introduces the retrieval hex module at modules/retrieval/.

**Why:** Provide standalone in-browser retrieval-augmented generation infrastructure so consumers can add RAG capabilities to any AI chat flow without requiring a backend server or external vector database.

**How to apply:** The retrieval module is fully standalone -- it does NOT import from ai-chat, local-llm, or any other module. Key design decisions: RetrievalPort defines addDocuments/search/removeDocuments/clear; BM25 adapter implements keyword TF-IDF from first principles (no external deps); vector-local adapter accepts pre-computed embeddings externally (embedding is a separate concern); chunker is a pure domain utility with configurable size/overlap; augmentPrompt outputs a plain string suitable for any AiChatPort consumer. Dependency order: port first (TPL-087), then chunker/BM25/vector-local/augmentPrompt in parallel (TPL-088-091), then public API last (TPL-092). PRD at docs/prd/retrieval.md, backlog at docs/backlog/retrieval.md. USM intentionally skipped (technical/architectural infrastructure). Created 2026-03-29.
