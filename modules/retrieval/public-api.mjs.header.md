---
fileId: contextrail-template:modules:retrieval:public-api
module: modules/retrieval
stability: evolving
steward: shared
api: module-public
hexLayer: application
boundedContext: retrieval
dependsOn:
  - modules/retrieval/ports/retrieval-port.mjs
  - modules/retrieval/ports/chunker-port.mjs
  - modules/retrieval/ports/tokenizer-port.mjs
  - modules/retrieval/ports/embedder-port.mjs
  - modules/retrieval/domain/chunker.mjs
  - modules/retrieval/domain/augment-prompt.mjs
  - modules/retrieval/adapters/bm25-adapter.mjs
  - modules/retrieval/adapters/vector-local-adapter.mjs
  - modules/retrieval/adapters/char-count-tokenizer.mjs
  - modules/retrieval/adapters/approx-tiktoken-tokenizer.mjs
  - modules/retrieval/adapters/echo-embedder.mjs
summary: Single entry point for the retrieval bounded module — re-exports port assertions, 4 chunker strategies, BM25/vector/hybrid search adapters, re-ranker, loaders, and augment-prompt.
owns: The sole permitted external entry point for the retrieval bounded context; the canonical re-export surface for all public factories and all port assertions.
boundaries: Must not contain implementation logic; must not import from outside the modules/retrieval/ tree; must not expose internal utilities that are not part of the public contract.
invariants: Every symbol exported here must be importable from this single file; adding a new public export requires a corresponding update to public-api.d.ts; no two exports may share the same symbol name.
risks: Adding a deep export path here accidentally leaks internal structure; removing an export silently breaks all external consumers without a compile error unless TypeScript is checked.
notesForLLM: "This is the only file external code may import from this module. Current exports: assertRetrievalPort, assertChunkerPort, assertTokenizerPort, assertEmbedderPort, createChunker (alias), createCharacterChunker, createRecursiveCharacterChunker, createSentenceChunker, createMarkdownChunker, createAugmentPrompt, createBm25Adapter, createVectorLocalAdapter, createCharCountTokenizer, createApproxTiktokenTokenizer, createEchoEmbedder."
tests:
  - tests/unit/retrieval.test.mjs
  - tests/unit/retrieval-chunker-port.test.mjs
  - tests/contract/retrieval-hex-contract.test.mjs
linkedDocs:
  - docs/prd/retrieval.md
  - docs/_generated/dependency-graph.json
specRefs:
  - TPL-087
  - TPL-092
  - TPL-098
  - TPL-099
  - TPL-100
  - TPL-101
  - TPL-102
  - TPL-001
related:
  - modules/retrieval/public-api.d.ts
  - modules/retrieval/types.d.ts
  - modules/retrieval/ports/retrieval-port.mjs
  - modules/retrieval/ports/chunker-port.mjs
  - modules/retrieval/ports/tokenizer-port.mjs
  - modules/retrieval/ports/embedder-port.mjs
  - modules/retrieval/domain/chunker.mjs
allowedDependencies:
  - modules/retrieval/ports/retrieval-port.mjs
  - modules/retrieval/ports/chunker-port.mjs
  - modules/retrieval/ports/tokenizer-port.mjs
  - modules/retrieval/ports/embedder-port.mjs
  - modules/retrieval/domain/chunker.mjs
  - modules/retrieval/domain/augment-prompt.mjs
  - modules/retrieval/adapters/bm25-adapter.mjs
  - modules/retrieval/adapters/vector-local-adapter.mjs
  - modules/retrieval/adapters/char-count-tokenizer.mjs
  - modules/retrieval/adapters/approx-tiktoken-tokenizer.mjs
  - modules/retrieval/adapters/echo-embedder.mjs
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/ports/**"
  - "modules/<other>/adapters/**"
  - react
  - express
  - fastify
  - "node:*"
exports:
  - assertChunkerPort
  - assertDocumentLoaderPort
  - assertEmbedderPort
  - assertQueryTransformerPort
  - assertReRankerPort
  - assertRetrievalPort
  - assertTokenizerPort
  - createApproxTiktokenTokenizer
  - createAugmentPrompt
  - createBm25Adapter
  - createCharacterChunker
  - createCharCountTokenizer
  - createChunker
  - createEchoEmbedder
  - createHtmlLoader
  - createHybridSearchAdapter
  - createMarkdownChunker
  - createMarkdownLoader
  - createMultiQueryTransformer
  - createPassthroughTransformer
  - createPlainTextLoader
  - createRecursiveCharacterChunker
  - createScoreThresholdReRanker
  - createSentenceChunker
  - createVectorLocalAdapter
  - createWeightedHybridAdapter
  - getLocale
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

