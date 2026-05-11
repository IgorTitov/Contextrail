<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for the RAG Retrieval hex module that provides in-browser retrieval-augmented generation with RetrievalPort, text chunker, BM25 adapter, vector-local adapter, and augmentPrompt pipeline.
@sidecar retrieval.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# RAG Retrieval Module

## Requirement intent

The starter template needs a hex module that enables retrieval-augmented generation (RAG) entirely in the browser without requiring a backend server. This module provides the retrieval side of the RAG pipeline: document ingestion, chunking, indexing, search, and prompt augmentation. It is designed to feed its output into any AiChatPort consumer but does not depend on ai-chat or local-llm at the module level.

The **retrieval** module provides:

- A **RetrievalPort** that defines the contract for document retrieval adapters. The port requires operations for adding documents, searching by query, removing documents by ID, and clearing the index. Search returns ranked results with relevance scores and source metadata.

- A **Chunker** domain utility that splits text into overlapping chunks with configurable size and overlap. Each chunk carries metadata tracking its source document ID, chunk index, and character offsets. The chunker is a pure domain function with no external dependencies.

- A **BM25 adapter** that implements keyword-based TF-IDF retrieval using the BM25 algorithm. It runs entirely in the browser with no external dependencies. It tokenizes documents at index time, builds an inverted index, and scores queries against the index using BM25 term-frequency / inverse-document-frequency weighting.

- A **Vector-local adapter** that implements in-browser vector similarity search using cosine similarity. This adapter accepts pre-computed embeddings externally -- it does NOT embed text itself. Embedding is a separate concern (consumers provide embeddings, e.g. from local-llm or an external API). The adapter stores document vectors and performs nearest-neighbor search using brute-force cosine similarity.

- An **augmentPrompt** domain pipeline function that takes a user query plus an array of retrieved chunks and formats them into a context-augmented prompt string suitable for LLM consumption. It supports configurable prompt templates and context windowing.

- A **public API** surface that exports all factories, type helpers, and the port assertion, following the JSDoc + `.d.ts` sidecar typing pattern established by other modules.

The module works standalone. It does not import from ai-chat, local-llm, or any other module. The augmentPrompt output is a plain string designed to be passed as a system prompt or context prefix to any AiChatPort's sendMessage/streamMessage.

All user-facing copy (error messages, status descriptions) must go through the i18n/messages layer.

## Classification

This is **technical/architectural** work. The retrieval module provides reusable infrastructure for in-browser RAG pipelines. USM is intentionally skipped because this is standalone infrastructure that does not introduce new user-facing workflows. Consumer modules or starter app integrations that wire retrieval into visible UI will require their own USM when that work arrives.

## Deliverables in scope (Slice 11)

### Module: Retrieval (`modules/retrieval/`)

#### 1. RetrievalPort Definition (TPL-087)

Hex port at `modules/retrieval/ports/retrieval-port.mjs`.

**RetrievalPort interface:**

- `addDocuments(docs)` -- accepts an array of RetrievalDocument objects; indexes them for search; returns a Promise resolving to an array of assigned document IDs
- `search(query, options?)` -- accepts a query string and optional RetrievalSearchOptions; returns a Promise resolving to an array of RetrievalResult objects ranked by relevance
- `removeDocuments(ids)` -- accepts an array of document IDs; removes them from the index; returns a Promise resolving to the count of removed documents
- `clear()` -- removes all documents from the index; returns a Promise

**Domain types:**

- `RetrievalDocument` -- document to index, with `id` (string, optional -- auto-generated if omitted), `content` (string), optional `metadata` (Record<string, unknown>)
- `RetrievalResult` -- search result with `documentId` (string), `content` (string), `score` (number, 0-1 normalized), `metadata` (Record<string, unknown>), optional `chunkIndex` (number)
- `RetrievalSearchOptions` -- search options with optional `topK` (number, default 5), optional `minScore` (number, 0-1 threshold), optional `filter` (Record<string, unknown> for metadata filtering)
- `RetrievalChunk` -- chunk with `documentId` (string), `chunkIndex` (number), `content` (string), `startOffset` (number), `endOffset` (number), `metadata` (Record<string, unknown>)

Constraints: The port must be framework-free and testable in isolation. The runtime assertion `assertRetrievalPort` must validate all required methods. Error messages must be i18n-ready string keys.

#### 2. Chunker Domain Utility (TPL-088)

Domain utility at `modules/retrieval/domain/chunker.mjs`.

- `createChunker(options?)` -- factory returning a chunker instance with configurable `chunkSize` (number, default 512 characters), `chunkOverlap` (number, default 64 characters), and `separator` (string or RegExp, default sentence boundaries)
- `chunk(text, documentId)` -- splits text into overlapping RetrievalChunk objects with metadata tracking the source document ID, chunk index, and character offsets (startOffset, endOffset)
- Handles edge cases: empty text, text shorter than chunk size, very long single tokens
- Pure function -- no side effects, no state beyond configuration

Constraints: Must be a pure domain utility with no external dependencies. Must produce deterministic output for the same input. Must not import from outside the retrieval module boundary. Character offsets must be accurate for reconstructing the original text from chunks.

#### 3. BM25 Adapter (TPL-089)

Adapter at `modules/retrieval/adapters/bm25-adapter.mjs`.

- Factory function `createBm25Adapter(options?)` returning a fresh adapter instance
- `addDocuments(docs)` -- tokenizes documents, builds/updates an inverted index with term frequencies and document lengths
- `search(query, options?)` -- tokenizes the query, scores each document using BM25 (k1=1.5, b=0.75 defaults, configurable), returns results ranked by score with normalized 0-1 scores
- `removeDocuments(ids)` -- removes documents from the inverted index
- `clear()` -- resets the entire index
- Internal tokenizer: lowercases, splits on whitespace and punctuation, strips common stop words
- BM25 parameters: configurable `k1` (term frequency saturation), `b` (document length normalization)
- Supports metadata filtering in search (filter by metadata key-value match)

Constraints: Must conform to RetrievalPort. Must pass assertRetrievalPort. Runs entirely in-browser with no external dependencies. Must be stateless across separate factory calls. Must handle large document sets efficiently (inverted index, not linear scan). All error messages use i18n keys.

#### 4. Vector-Local Adapter (TPL-090)

Adapter at `modules/retrieval/adapters/vector-local-adapter.mjs`.

- Factory function `createVectorLocalAdapter(options?)` returning a fresh adapter instance
- `addDocuments(docs)` -- accepts documents where each document's metadata includes an `embedding` field (Float32Array or number[]) containing the pre-computed embedding vector. Stores the document content and embedding for search
- `search(query, options?)` -- accepts a query string. The options object requires a `queryEmbedding` (Float32Array or number[]) for the query's embedding vector. Computes cosine similarity between the query embedding and all stored document embeddings. Returns results ranked by similarity
- `removeDocuments(ids)` -- removes documents and their embeddings from the store
- `clear()` -- resets the entire store
- Cosine similarity: dot product of normalized vectors
- Supports metadata filtering in search (filter by metadata key-value match, excluding the embedding field)

Constraints: Must conform to RetrievalPort. Must pass assertRetrievalPort. The adapter does NOT embed text -- it only compares pre-computed embeddings. This keeps embedding as a separate concern. Runs entirely in-browser with no external dependencies. Must be stateless across separate factory calls. All error messages use i18n keys. Must validate that embeddings have consistent dimensionality within an adapter instance.

#### 5. augmentPrompt Pipeline (TPL-091)

Domain utility at `modules/retrieval/domain/augment-prompt.mjs`.

- `createAugmentPrompt(options?)` -- factory returning a pipeline function with configurable `maxContextLength` (number, default 4000 characters), `template` (string, template with `{{context}}` and `{{query}}` placeholders), `separator` (string, default newline between chunks), `includeMetadata` (boolean, default false)
- `augment(query, results)` -- accepts a query string and an array of RetrievalResult objects; formats the results as a context-augmented prompt string; truncates context to fit within maxContextLength; returns the formatted prompt string
- Default template: a clear instruction prefix followed by the context block and the user's query
- Context ordering: results are included in relevance-score order (highest first)
- When context exceeds maxContextLength, lower-ranked results are dropped (not mid-chunk truncation)

Constraints: Must be a pure domain utility. Must not import from outside the retrieval module boundary. Must produce deterministic output. Must not depend on any LLM or chat module -- it outputs a plain string. Template must support simple placeholder substitution. Must handle edge cases: empty results array, query-only (no context), results exceeding the length budget.

#### 6. Public API + Types (TPL-092)

`modules/retrieval/public-api.mjs` exporting:

- `assertRetrievalPort`
- `createChunker`
- `createBm25Adapter`
- `createVectorLocalAdapter`
- `createAugmentPrompt`

Plus `public-api.d.ts` sidecar re-exporting all types including RetrievalPort, RetrievalDocument, RetrievalResult, RetrievalSearchOptions, RetrievalChunk, and the configuration types.

Plus `modules/retrieval/types.d.ts` containing consolidated type definitions.

Plus `modules/retrieval/messages.mjs` containing all i18n message keys for the module.

Constraints: Only the documented surface is exported. Internal implementation details are not accessible through the public API. The typing pattern (JSDoc + `.d.ts` sidecar) must follow the reference established by other modules. The module must work without any build step.

## Out of scope

- Embedding generation (text-to-vector) -- that is a separate concern, potentially from local-llm or external APIs
- Persistent storage of indexes across page reloads (IndexedDB persistence)
- Server-side retrieval or vector database integration
- Hybrid search (BM25 + vector combined ranking) -- can be added later
- Cross-module imports -- the retrieval module stands alone
- Semantic chunking (content-aware splitting by headings, code blocks, etc.)
- Document format parsing (PDF, DOCX, etc.)
- Reranking models or cross-encoder scoring
- Multi-index federation (searching across multiple independent indexes)
- Streaming search results
- Starter app UI integration (will be a separate slice if needed)

## Cross-cutting constraints

- Module uses vanilla JS (ESM, no build step)
- The module follows the hex port/adapter pattern consistent with existing modules
- Cross-module access goes through `public-api.mjs` only
- The retrieval module does NOT import from any other module (fully standalone)
- No new framework or runtime dependency
- JSDoc + `.d.ts` sidecar typing pattern following the established reference
- All user-facing copy (error messages, validation messages) must use i18n message keys
- Existing starter features must continue to work identically
- No external libraries required -- BM25 and cosine similarity are implemented from first principles

## Acceptance boundaries

### Slice 11

- RetrievalPort defines addDocuments, search, removeDocuments, and clear operations
- Domain types define RetrievalDocument with id, content, and optional metadata
- Domain types define RetrievalResult with documentId, content, score, metadata, and optional chunkIndex
- Domain types define RetrievalSearchOptions with optional topK, minScore, and filter
- Domain types define RetrievalChunk with documentId, chunkIndex, content, startOffset, and endOffset
- assertRetrievalPort validates all required port methods and throws for non-conformant adapters
- Chunker splits text into overlapping chunks with configurable size and overlap
- Chunker produces accurate character offsets for reconstructing original text
- Chunker handles edge cases (empty text, text shorter than chunk size)
- BM25 adapter tokenizes documents and builds an inverted index
- BM25 adapter scores queries using BM25 with configurable k1 and b parameters
- BM25 adapter returns results ranked by relevance with normalized 0-1 scores
- BM25 adapter supports metadata filtering in search
- BM25 adapter passes assertRetrievalPort
- Vector-local adapter stores document embeddings and performs cosine similarity search
- Vector-local adapter requires pre-computed embeddings (does not embed text itself)
- Vector-local adapter validates embedding dimensionality consistency
- Vector-local adapter supports metadata filtering in search
- Vector-local adapter passes assertRetrievalPort
- augmentPrompt formats retrieved results as a context-augmented prompt string
- augmentPrompt supports configurable templates with {{context}} and {{query}} placeholders
- augmentPrompt truncates context by dropping low-ranked results when exceeding maxContextLength
- augmentPrompt handles edge cases (empty results, query-only)
- public-api.mjs exports only the documented surface
- JSDoc typedefs are present in all source files and reference the .d.ts sidecars
- .d.ts sidecars define TypeScript-compatible interfaces without introducing build requirements
- messages.mjs exports all i18n message keys for the module
- The module works without any build step
- The module does not import from any other module (fully standalone)
- No external libraries are required
- All error messages use i18n message keys

```trace-yaml
work_item:
  id: TPL-086
  type: meta
  title: RAG Retrieval Module
  parent_ref:
  status: done
  module_ref: retrieval
  spec_refs:
    - docs/prd/retrieval.md
    - docs/prd/index.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
  acceptance:
    - RetrievalPort defines addDocuments, search, removeDocuments, and clear with domain types and runtime assertion.
    - Chunker splits text into overlapping chunks with configurable size, overlap, and accurate offsets.
    - BM25 adapter provides keyword-based TF-IDF retrieval running entirely in-browser with no external deps.
    - Vector-local adapter provides cosine similarity search over pre-computed embeddings with no external deps.
    - augmentPrompt formats retrieved chunks as context-augmented prompt strings for LLM consumption.
    - Public API exports only the documented surface with JSDoc and .d.ts sidecar typing.
    - All error messages and copy use i18n message keys.
    - The module is fully standalone with no cross-module imports.
```
