/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single bounded entry point for the retrieval module, re-exporting every retrieval port, chunker, loader, embedder, transformer, re-ranker, and prompt-augmentation helper consumed by other modules; see sidecar `exports:` for the canonical list.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx retrieval
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the retrieval bounded module.
 * The only file other modules may import.
 *
 * SpecRefs: TPL-087; TPL-092
 */

// Ports
export { assertRetrievalPort } from './ports/retrieval-port.mjs';
export { assertChunkerPort } from './ports/chunker-port.mjs';
export { assertTokenizerPort } from './ports/tokenizer-port.mjs';
export { assertEmbedderPort } from './ports/embedder-port.mjs';
export { assertReRankerPort } from './ports/reranker-port.mjs';

// Domain — chunkers
export {
  createChunker,
  createCharacterChunker,
  createRecursiveCharacterChunker,
  createSentenceChunker,
  createMarkdownChunker,
} from './domain/chunker.mjs';
export { createAugmentPrompt } from './domain/augment-prompt.mjs';

// Adapters — retrieval
export { createBm25Adapter } from './adapters/bm25-adapter.mjs';
export { createVectorLocalAdapter } from './adapters/vector-local-adapter.mjs';

// Adapters — tokenizer
export { createCharCountTokenizer } from './adapters/char-count-tokenizer.mjs';
export { createApproxTiktokenTokenizer } from './adapters/approx-tiktoken-tokenizer.mjs';

// Adapters — embedder
export { createEchoEmbedder } from './adapters/echo-embedder.mjs';

// Adapters — hybrid search
export {
  createHybridSearchAdapter,
  createWeightedHybridAdapter,
} from './adapters/hybrid-search-adapter.mjs';

// Adapters — re-ranker
export { createScoreThresholdReRanker } from './adapters/score-threshold-reranker.mjs';

// Ports — document loaders & query transformers
export { assertDocumentLoaderPort } from './ports/document-loader-port.mjs';
export { assertQueryTransformerPort } from './ports/query-transformer-port.mjs';

// Adapters — document loaders
export { createPlainTextLoader } from './adapters/plain-text-loader.mjs';
export { createMarkdownLoader } from './adapters/markdown-loader.mjs';
export { createHtmlLoader } from './adapters/html-loader.mjs';

// Adapters — query transformers
export { createPassthroughTransformer } from './adapters/passthrough-transformer.mjs';
export { createMultiQueryTransformer } from './adapters/multi-query-transformer.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
