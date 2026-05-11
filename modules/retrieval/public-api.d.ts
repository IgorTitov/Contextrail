/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide TypeScript declarations for the full retrieval module public surface, including assertChunkerPort, ChunkerPort, and the four chunker strategy factory signatures added in Slice 13.
 * @sidecar public-api.d.ts.header.md
 * @layer module | @hex application | @ctx retrieval
 * @public true
 * @edit sync-only
 */

/**
 * Type declarations for the retrieval module public API.
 *
 * SpecRefs: TPL-087; TPL-092
 */

export {
  RetrievalDocument,
  RetrievalResult,
  RetrievalSearchOptions,
  RetrievalChunk,
  RetrievalPort,
  ChunkerPort,
  ChunkerOptions,
  Chunker,
  RecursiveCharacterChunkerOptions,
  SentenceChunkerOptions,
  MarkdownChunkerOptions,
  Bm25AdapterOptions,
  VectorLocalAdapterOptions,
  AugmentPromptOptions,
  AugmentPrompt,
  assertRetrievalPort,
  createChunker,
  createBm25Adapter,
  createVectorLocalAdapter,
  createAugmentPrompt,
} from './types.js';

export { assertChunkerPort } from './ports/chunker-port.js';

export declare function createCharacterChunker(options?: import('./types.js').ChunkerOptions): import('./types.js').ChunkerPort;
export declare function createRecursiveCharacterChunker(options?: import('./types.js').RecursiveCharacterChunkerOptions): import('./types.js').ChunkerPort;
export declare function createSentenceChunker(options?: import('./types.js').SentenceChunkerOptions): import('./types.js').ChunkerPort;
export declare function createMarkdownChunker(options?: import('./types.js').MarkdownChunkerOptions): import('./types.js').ChunkerPort;
