<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for the RAG Extensions epic that adds pluggable chunking strategies, tokenizer and embedder ports, hybrid search with re-ranking, a knowledge-graph module, and document loaders with query pipeline to the retrieval infrastructure.
@sidecar rag-extensions.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# RAG Extensions

## Requirement intent

The existing retrieval module (Slice 11) provides a solid foundation for in-browser RAG with RetrievalPort, a character-level chunker, BM25 keyword search, vector-local cosine similarity search, and augmentPrompt. The RAG Extensions epic builds on this foundation across five slices to make the retrieval infrastructure production-grade and extensible.

The extensions provide:

- **Pluggable chunking** via a formal ChunkerPort contract, with multiple strategies (recursive-character, sentence, markdown) behind it, so consumers can choose the chunking approach that best fits their document format.

- **Token-aware context budgeting** via TokenizerPort so augmentPrompt can work in tokens instead of raw characters, plus an EmbedderPort contract that formalizes the embedding concern as a port.

- **Hybrid search and re-ranking** so consumers can combine BM25 keyword search with vector similarity via Reciprocal Rank Fusion, apply configurable weights, and filter results through a re-ranker port.

- **Knowledge-graph RAG** as a new standalone hex module providing entity and relationship extraction, graph storage, BFS traversal, and community detection for graph-augmented retrieval scenarios.

- **Document loaders and query pipeline** providing pluggable document ingestion from plain text, markdown, and HTML, plus query transformation for multi-query expansion.

## Classification

This is **technical/architectural** work. All five slices provide reusable infrastructure for in-browser RAG pipelines. USM is intentionally skipped because these are standalone infrastructure modules that do not introduce new user-facing workflows. Consumer modules or starter app integrations that wire these capabilities into visible UI will require their own USM when that work arrives.

## Deliverables in scope

### Slice 13: ChunkerPort + Pluggable Chunking Strategies

#### 1. ChunkerPort Contract (TPL-098)

Hex port defining the contract for pluggable chunking strategies.

**ChunkerPort interface:**

- `chunk(text, documentId)` -- accepts a text string and document ID; returns an array of RetrievalChunk objects with metadata tracking source document, chunk index, and character offsets

The port assertion `assertChunkerPort` validates the required method.

Constraints: The port must be framework-free and testable in isolation. Must integrate cleanly with existing RetrievalChunk domain type. Error messages must use i18n keys.

#### 2. Character Chunker Adapter (TPL-099)

Refactor the existing `createChunker` as a named adapter behind ChunkerPort.

- Factory `createCharacterChunker(options?)` with the same configurable `chunkSize` and `chunkOverlap` as the existing chunker
- Must pass `assertChunkerPort`
- The existing `createChunker` export is retained as an alias for backward compatibility

Constraints: Must not break existing consumers of `createChunker`. Must conform to ChunkerPort.

#### 3. RecursiveCharacterChunker Adapter (TPL-100)

Adapter that splits text using a hierarchy of separators, falling through to the next separator when chunks are still too large.

- Factory `createRecursiveCharacterChunker(options?)` with configurable `chunkSize`, `chunkOverlap`, and `separators` (default: `["\n\n", "\n", ". ", " "]`)
- Splits by the first separator that produces chunks within the size limit; falls through to the next separator for oversized chunks
- Must pass `assertChunkerPort`

Constraints: No external dependencies. Must produce deterministic output. Must handle edge cases (no separators found, text shorter than chunk size).

#### 4. SentenceChunker Adapter (TPL-101)

Adapter that splits text at sentence boundaries using regex-based detection.

- Factory `createSentenceChunker(options?)` with configurable `maxChunkSentences` (default 5), `chunkOverlapSentences` (default 1)
- Sentence boundary detection via regex (handles `.`, `!`, `?` followed by whitespace, with common abbreviation guards)
- Must pass `assertChunkerPort`

Constraints: No external dependencies. Regex-based only (no NLP library). Must handle edge cases (text with no sentence boundaries, single-sentence text).

#### 5. MarkdownChunker Adapter (TPL-102)

Adapter that splits markdown text by headings, preserving hierarchy metadata.

- Factory `createMarkdownChunker(options?)` with configurable `maxChunkSize` (fallback for very long sections)
- Splits at heading boundaries (`#`, `##`, `###`, etc.)
- Each chunk's metadata includes `heading`, `headingLevel`, and `headingPath` (ancestor heading chain)
- Oversized sections fall back to character splitting within the section
- Must pass `assertChunkerPort`

Constraints: No external dependencies. Regex-based markdown parsing only (no AST parser). Must handle edge cases (no headings, deeply nested headings, empty sections).

#### 6. Public API Update (TPL-103)

Update `modules/retrieval/public-api.mjs` and type sidecars to export:

- `assertChunkerPort`
- `createCharacterChunker`
- `createRecursiveCharacterChunker`
- `createSentenceChunker`
- `createMarkdownChunker`

Update `types.d.ts` with ChunkerPort interface and all chunker option types. Update `messages.mjs` with new i18n keys.

Constraints: Backward-compatible -- existing `createChunker` export must still work. Only the documented surface is exported.

### Slice 14: TokenizerPort + EmbedderPort

#### 1. TokenizerPort Contract (TPL-104)

Hex port defining the contract for text tokenization.

**TokenizerPort interface:**

- `countTokens(text)` -- accepts a text string; returns a number representing the token count
- `truncateToTokens(text, maxTokens)` -- accepts a text string and max token count; returns a truncated string

The port assertion `assertTokenizerPort` validates the required methods.

Constraints: Framework-free. Error messages use i18n keys.

#### 2. Character-Count Tokenizer Adapter (TPL-105)

Zero-dependency default tokenizer that treats 1 character as 1 token.

- Factory `createCharacterTokenizer()` returning a TokenizerPort-conformant adapter
- `countTokens(text)` returns `text.length`
- `truncateToTokens(text, max)` returns `text.slice(0, max)`
- Must pass `assertTokenizerPort`

Constraints: No external dependencies. Simplest possible default.

#### 3. Approximate Tiktoken Adapter (TPL-106)

Heuristic tokenizer that estimates token count using the ~4 chars per token approximation for English text.

- Factory `createApproximateTiktokenAdapter(options?)` with configurable `charsPerToken` (default 4)
- `countTokens(text)` returns `Math.ceil(text.length / charsPerToken)`
- `truncateToTokens(text, max)` returns `text.slice(0, max * charsPerToken)`
- Must pass `assertTokenizerPort`

Constraints: No npm dependencies. This is explicitly a heuristic approximation, not a real tokenizer.

#### 4. Token-Aware augmentPrompt Integration (TPL-107)

Integrate TokenizerPort into augmentPrompt so `maxContextLength` can work in tokens instead of characters.

- `createAugmentPrompt(options?)` gains an optional `tokenizer` option accepting a TokenizerPort instance
- When `tokenizer` is provided, `maxContextLength` is interpreted as a token budget and the tokenizer is used for counting and truncation
- When `tokenizer` is not provided, the existing character-based behavior is unchanged (backward-compatible)

Constraints: Must not break existing behavior when no tokenizer is provided. Must not introduce a hard dependency on any specific tokenizer adapter.

#### 5. EmbedderPort Contract (TPL-108)

Hex port defining the contract for text embedding.

**EmbedderPort interface:**

- `embed(texts)` -- accepts an array of strings; returns a Promise resolving to an array of Float32Array embeddings

The port assertion `assertEmbedderPort` validates the required method.

Constraints: Framework-free. The port only defines the contract; actual embedding implementations (e.g., from local-llm) are separate concerns.

#### 6. Echo Embedder Adapter (TPL-109)

Testing adapter that produces deterministic pseudo-random embeddings.

- Factory `createEchoEmbedder(options?)` with configurable `dimensions` (default 128)
- `embed(texts)` returns deterministic embeddings derived from the text content (e.g., hash-based) so that identical texts produce identical embeddings
- Must pass `assertEmbedderPort`

Constraints: For testing only. No external dependencies. Deterministic output for the same input.

### Slice 15: Hybrid Search + Re-ranker

#### 1. HybridSearchAdapter (TPL-110)

Adapter that wraps multiple RetrievalPort instances and merges results via Reciprocal Rank Fusion (RRF).

- Factory `createHybridSearchAdapter(options)` accepting an array of RetrievalPort sources
- `search(query, options?)` queries all sources, merges results using RRF with configurable `k` parameter (default 60)
- `addDocuments`, `removeDocuments`, `clear` delegate to all wrapped sources
- Must pass `assertRetrievalPort`

RRF formula: `score(d) = sum(1 / (k + rank_i(d)))` across all sources where `rank_i(d)` is the rank of document `d` in source `i`.

Constraints: Must conform to RetrievalPort. No external dependencies. Must handle cases where a document appears in some sources but not others. Must deduplicate results by documentId.

#### 2. WeightedHybridAdapter (TPL-111)

Extension of hybrid search with configurable per-source weights.

- Factory `createWeightedHybridAdapter(options)` accepting sources with associated weights (e.g., `[{ source, weight: 0.7 }, { source, weight: 0.3 }]`)
- Weighted RRF: `score(d) = sum(weight_i / (k + rank_i(d)))` across sources
- Must pass `assertRetrievalPort`

Constraints: Weights must be positive. Must normalize final scores to 0-1 range. No external dependencies.

#### 3. ReRankerPort Contract (TPL-112)

Hex port defining the contract for result re-ranking.

**ReRankerPort interface:**

- `rerank(query, results)` -- accepts a query string and an array of RetrievalResult objects; returns a Promise resolving to a re-ordered array of RetrievalResult objects with updated scores

The port assertion `assertReRankerPort` validates the required method.

Constraints: Framework-free. Error messages use i18n keys.

#### 4. ScoreThreshold Re-ranker Adapter (TPL-113)

Adapter that filters results below a configurable score threshold.

- Factory `createScoreThresholdReranker(options)` with configurable `threshold` (number, 0-1)
- `rerank(query, results)` returns only results with `score >= threshold`, preserving original order
- Must pass `assertReRankerPort`

Constraints: No external dependencies. Must handle empty results and edge cases where all results are below threshold.

### Slice 16: GraphRAG Module

A new hex module at `modules/knowledge-graph/` providing graph-based RAG infrastructure.

#### 1. Domain Types (TPL-114)

Domain types at `modules/knowledge-graph/domain/types.d.ts`:

- `Entity` -- `{ id: string, name: string, type: string, metadata: Record<string, unknown> }`
- `Relationship` -- `{ id: string, sourceId: string, targetId: string, type: string, weight: number, metadata: Record<string, unknown> }`
- `KnowledgeGraph` -- `{ entities: Entity[], relationships: Relationship[] }`
- `Community` -- `{ id: string, entityIds: string[] }`

Plus messages.mjs with i18n keys for the module.

Constraints: Types must be framework-free. Must follow the JSDoc + .d.ts sidecar pattern.

#### 2. GraphStorePort (TPL-115)

Hex port at `modules/knowledge-graph/ports/graph-store-port.mjs`.

**GraphStorePort interface:**

- `addEntities(entities)` -- adds entities to the graph; returns assigned IDs
- `addRelationships(relationships)` -- adds relationships to the graph; returns assigned IDs
- `getNeighbors(entityId, options?)` -- returns entities connected to the given entity, with optional depth and relationship type filters
- `traverse(startId, options?)` -- performs graph traversal from a starting entity; returns visited entities and relationships
- `clear()` -- removes all entities and relationships

Port assertion `assertGraphStorePort` validates all required methods.

Constraints: Framework-free. Error messages use i18n keys.

#### 3. Memory Graph Adapter (TPL-116)

In-memory adapter implementing GraphStorePort.

- Factory `createMemoryGraphAdapter()` returning a fresh adapter instance
- Stores entities and relationships in Maps for O(1) lookup
- `getNeighbors` returns directly connected entities (single hop by default)
- `traverse` performs BFS with configurable `maxDepth` (default 2) and optional `relationshipTypes` filter
- Must pass `assertGraphStorePort`

Constraints: No external dependencies. No shared state between factory calls.

#### 4. EntityExtractorPort + Regex Adapter (TPL-117)

Hex port and default adapter for entity extraction.

**EntityExtractorPort interface:**

- `extractEntities(text)` -- accepts a text string; returns an array of Entity objects

Port assertion `assertEntityExtractorPort`.

**Regex adapter:**

- Factory `createRegexEntityExtractor(options?)` with configurable patterns
- Default patterns: proper nouns (capitalized words not at sentence start), quoted terms, and configurable custom regex patterns
- Each extracted entity has a `type` derived from the pattern that matched (e.g., "proper_noun", "quoted_term", "custom")

Constraints: Regex-based only. No NLP library. No external dependencies. Must deduplicate entities by normalized name.

#### 5. RelationshipExtractorPort + Co-occurrence Adapter (TPL-118)

Hex port and default adapter for relationship extraction.

**RelationshipExtractorPort interface:**

- `extractRelationships(text, entities)` -- accepts a text string and an array of Entity objects; returns an array of Relationship objects

Port assertion `assertRelationshipExtractorPort`.

**Co-occurrence adapter:**

- Factory `createCooccurrenceRelationshipExtractor(options?)` with configurable `windowSize` (default: same sentence or paragraph)
- Entities appearing within the same window are connected with a `co_occurs` relationship
- Relationship `weight` reflects co-occurrence frequency (normalized 0-1)

Constraints: No external dependencies. Must handle entities that appear multiple times in text.

#### 6. BFS Multi-Hop Traversal (TPL-119)

Domain utility for configurable BFS graph traversal.

- `createBfsTraversal(options?)` with configurable `maxDepth` (default 2), `maxNodes` (default 100), `relationshipTypes` filter
- Returns `{ entities: Entity[], relationships: Relationship[], depth: number }`
- Visited-set to prevent cycles
- Respects maxNodes budget to prevent runaway traversal in dense graphs

Constraints: Pure domain utility. No external dependencies. Must handle disconnected graphs and cycles gracefully.

#### 7. Community Detection (TPL-120)

Domain utility implementing connected-components community detection.

- `detectCommunities(graph)` -- accepts a KnowledgeGraph; returns an array of Community objects
- Uses Union-Find (disjoint-set) algorithm for efficient connected-component detection
- Each community contains the IDs of all entities in the connected component

Constraints: Pure domain utility. No external dependencies. Must handle graphs with isolated entities (single-entity communities).

#### 8. Public API + Types (TPL-121)

`modules/knowledge-graph/public-api.mjs` exporting:

- `assertGraphStorePort`, `assertEntityExtractorPort`, `assertRelationshipExtractorPort`
- `createMemoryGraphAdapter`
- `createRegexEntityExtractor`
- `createCooccurrenceRelationshipExtractor`
- `createBfsTraversal`
- `detectCommunities`

Plus `public-api.d.ts` and `types.d.ts` sidecars. Plus `messages.mjs` with all i18n keys.

Constraints: Only the documented surface is exported. JSDoc + .d.ts sidecar typing pattern. The module works without any build step. The module does not import from any other module (fully standalone).

### Slice 17: Document Loaders + Query Pipeline

#### 1. DocumentLoaderPort Contract (TPL-122)

Hex port for document loading.

**DocumentLoaderPort interface:**

- `load(source)` -- accepts a source (string content, URL, or configuration object); returns a Promise resolving to an array of RetrievalDocument objects

Port assertion `assertDocumentLoaderPort`.

Constraints: Framework-free. Error messages use i18n keys. The port does not prescribe the source format -- adapters decide what they accept.

#### 2. PlainTextLoader Adapter (TPL-123)

Passthrough loader for plain text.

- Factory `createPlainTextLoader(options?)` with optional default metadata
- `load(source)` accepts a string and returns it as a single RetrievalDocument
- Must pass `assertDocumentLoaderPort`

Constraints: No external dependencies. Simplest possible loader.

#### 3. MarkdownLoader Adapter (TPL-124)

Section-aware markdown loader.

- Factory `createMarkdownLoader(options?)` with configurable `splitByHeadings` (default true), `minHeadingLevel` (default 1)
- When `splitByHeadings` is true, splits markdown into one RetrievalDocument per heading section
- Each document's metadata includes `heading`, `headingLevel`, `headingPath`
- Frontmatter (if present) is extracted into metadata
- Must pass `assertDocumentLoaderPort`

Constraints: No external dependencies. Regex-based parsing. Must handle documents with no headings (returns single document).

#### 4. HtmlLoader Adapter (TPL-125)

HTML-to-text loader that strips tags while preserving structure.

- Factory `createHtmlLoader(options?)` with configurable `preserveLinks` (default false), `preserveHeadings` (default true)
- Strips HTML tags, converts block elements to paragraph breaks, collapses whitespace
- When `preserveHeadings` is true, heading text is prefixed with markdown-style `#` markers in output
- When `preserveLinks` is true, link text includes the href in markdown format
- Must pass `assertDocumentLoaderPort`

Constraints: No external dependencies. Regex-based HTML stripping (not a full DOM parser). Designed for simple HTML content, not complex web pages.

#### 5. QueryTransformerPort Contract (TPL-126)

Hex port for query transformation.

**QueryTransformerPort interface:**

- `transform(query)` -- accepts a query string; returns a Promise resolving to a string or array of strings (expanded queries)

Port assertion `assertQueryTransformerPort`.

Constraints: Framework-free. Error messages use i18n keys.

#### 6. PassthroughTransformer + MultiQueryTransformer Adapters (TPL-127)

Two adapters for query transformation.

**PassthroughTransformer:**

- Factory `createPassthroughTransformer()` returning the query unchanged
- Must pass `assertQueryTransformerPort`

**MultiQueryTransformer:**

- Factory `createMultiQueryTransformer(options)` with configurable `templates` (array of template strings with `{{query}}` placeholder)
- `transform(query)` returns an array of strings: the original query plus each template with the query substituted
- Default templates provide 2-3 rephrasings (e.g., more specific, broader context)
- Must pass `assertQueryTransformerPort`

Constraints: No external dependencies. Templates use simple `{{query}}` placeholder substitution, not LLM-based rewriting.

#### 7. Public API Update (TPL-128)

Update `modules/retrieval/public-api.mjs` and type sidecars to export all new Slice 14, 15, and 17 additions:

- TokenizerPort, EmbedderPort, ReRankerPort, DocumentLoaderPort, QueryTransformerPort assertions
- All new adapter factories
- Updated types.d.ts with all new interfaces

Constraints: Backward-compatible. Only the documented surface is exported.

## Out of scope

- Real tokenizer implementations (actual tiktoken, SentencePiece) -- those require npm dependencies or WASM
- LLM-based entity extraction or query rewriting -- those depend on ai-chat/local-llm
- Persistent graph storage (IndexedDB, file-based) -- memory adapter only for now
- Server-side retrieval or external vector database integration
- PDF, DOCX, or binary document format parsing
- Cross-encoder re-ranking models
- Streaming search results
- Starter app UI integration for any of these features
- Cross-module imports between knowledge-graph and retrieval (they are standalone)

## Cross-cutting constraints

- All modules use vanilla JS (ESM, no build step)
- Hex port/adapter pattern consistent with existing modules
- Cross-module access goes through `public-api.mjs` only
- No new framework or runtime dependency unless explicitly noted
- JSDoc + `.d.ts` sidecar typing pattern
- All user-facing copy (error messages, validation messages) must use i18n message keys
- Existing starter features must continue to work identically
- No external libraries required unless explicitly noted
- The retrieval module remains backward-compatible with Slice 11 consumers
- The knowledge-graph module is a new standalone hex module with no cross-module imports

## Acceptance boundaries

### Slice 13

- ChunkerPort defines a chunk(text, documentId) contract with runtime assertion
- Existing createChunker is refactored as createCharacterChunker behind ChunkerPort and remains backward-compatible
- RecursiveCharacterChunker splits by separator hierarchy and falls through for oversized chunks
- SentenceChunker splits at regex-detected sentence boundaries
- MarkdownChunker splits by headings and preserves hierarchy metadata
- All chunker adapters pass assertChunkerPort
- Public API exports all new chunker factories and assertions
- Types and messages are updated

### Slice 14

- TokenizerPort defines countTokens and truncateToTokens with runtime assertion
- Character-count tokenizer adapter provides zero-dep default
- Approximate tiktoken adapter provides heuristic estimation
- augmentPrompt supports optional tokenizer for token-based context budgeting
- augmentPrompt without tokenizer remains backward-compatible (character-based)
- EmbedderPort defines embed(texts) with runtime assertion
- Echo embedder adapter produces deterministic pseudo-random embeddings for testing
- All adapters pass their respective port assertions

### Slice 15

- HybridSearchAdapter wraps multiple RetrievalPort sources and merges via RRF
- WeightedHybridAdapter supports per-source weights in the fusion formula
- Both hybrid adapters pass assertRetrievalPort
- ReRankerPort defines rerank(query, results) with runtime assertion
- ScoreThreshold re-ranker filters below threshold
- ScoreThreshold re-ranker passes assertReRankerPort

### Slice 16

- Knowledge-graph module exists at modules/knowledge-graph/ as a standalone hex module
- Domain types define Entity, Relationship, KnowledgeGraph, and Community
- GraphStorePort defines addEntities, addRelationships, getNeighbors, traverse, and clear
- Memory graph adapter stores in Maps and performs BFS traversal
- EntityExtractorPort defines extractEntities with regex adapter extracting proper nouns and quoted terms
- RelationshipExtractorPort defines extractRelationships with co-occurrence adapter
- BFS traversal supports configurable depth and node budget with cycle prevention
- Community detection returns connected components via Union-Find
- Public API exports only the documented surface with JSDoc and .d.ts sidecar typing
- The module does not import from any other module

### Slice 17

- DocumentLoaderPort defines load(source) with runtime assertion
- PlainTextLoader provides passthrough loading
- MarkdownLoader provides section-aware splitting by headings with metadata
- HtmlLoader strips tags while preserving structure
- All loaders pass assertDocumentLoaderPort
- QueryTransformerPort defines transform(query) with runtime assertion
- PassthroughTransformer returns query unchanged
- MultiQueryTransformer expands queries via template substitution
- Both transformers pass assertQueryTransformerPort
- Public API exports all new factories and assertions from Slices 14, 15, and 17

```trace-yaml
work_item:
  id: TPL-097
  type: meta
  title: RAG Extensions
  parent_ref:
  status: done
  module_ref: retrieval, knowledge-graph
  spec_refs:
    - docs/prd/rag-extensions.md
    - docs/prd/index.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
  acceptance:
    - ChunkerPort formalizes pluggable chunking with four adapter strategies.
    - TokenizerPort and EmbedderPort formalize tokenization and embedding as hex ports.
    - augmentPrompt supports token-based context budgeting via optional TokenizerPort.
    - Hybrid search merges multiple RetrievalPort sources via Reciprocal Rank Fusion.
    - ReRankerPort formalizes result re-ranking with score-threshold adapter.
    - Knowledge-graph module provides entity/relationship extraction, graph storage, BFS traversal, and community detection.
    - Document loaders provide pluggable ingestion for plain text, markdown, and HTML.
    - Query pipeline provides pluggable query transformation with multi-query expansion.
    - All new ports have runtime assertions and i18n error messages.
    - All modules remain standalone with no cross-module imports.
```
