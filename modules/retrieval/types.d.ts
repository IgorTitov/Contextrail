/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Define all shared TypeScript types and interfaces for the retrieval module, including RetrievalDocument, RetrievalResult, RetrievalPort, ChunkerPort, all chunker option interfaces, Chunker, AugmentPrompt, and factory function signatures.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx retrieval
 * @public true
 * @edit careful
 */

/**
 * TypeScript type definitions for the retrieval module.
 *
 * SpecRefs: TPL-087; TPL-092
 */

export interface RetrievalDocument {
  id?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievalResult {
  documentId: string;
  content: string;
  /** 0 to 1, normalized */
  score: number;
  metadata: Record<string, unknown>;
  chunkIndex?: number;
}

export interface RetrievalSearchOptions {
  /** Maximum number of results (default 5) */
  topK?: number;
  /** Minimum score threshold, 0-1 */
  minScore?: number;
  /** Metadata key-value filter */
  filter?: Record<string, unknown>;
  /** Query embedding for vector search */
  queryEmbedding?: Float32Array | number[];
}

export interface RetrievalChunk {
  documentId: string;
  chunkIndex: number;
  content: string;
  startOffset: number;
  endOffset: number;
  metadata: Record<string, unknown>;
}

export interface RetrievalPort {
  addDocuments(docs: RetrievalDocument[]): Promise<string[]>;
  search(query: string, options?: RetrievalSearchOptions): Promise<RetrievalResult[]>;
  removeDocuments(ids: string[]): Promise<number>;
  clear(): Promise<void>;
}

export interface ChunkerOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separator?: string | RegExp;
}

export interface Chunker {
  chunk(text: string, documentId: string): RetrievalChunk[];
}

/** Port contract that all chunker adapters must satisfy. */
export interface ChunkerPort {
  chunk(text: string, documentId: string): RetrievalChunk[];
}

export interface RecursiveCharacterChunkerOptions {
  chunkSize?: number;
  separators?: string[];
}

export interface SentenceChunkerOptions {
  maxChunkSize?: number;
}

export interface MarkdownChunkerOptions {
  maxChunkSize?: number;
}

export interface Bm25AdapterOptions {
  k1?: number;
  b?: number;
}

export interface VectorLocalAdapterOptions {
  // Reserved for future configuration
}

export interface TokenizerPort {
  countTokens(text: string): number;
  truncateToTokens(text: string, maxTokens: number): string;
}

export interface EmbedderPort {
  embed(texts: string[]): Promise<Float32Array[]>;
}

export interface CharCountTokenizerOptions {
  // Reserved
}

export interface ApproxTiktokenOptions {
  charsPerToken?: number;
}

export interface EchoEmbedderOptions {
  dimensions?: number;
}

export interface ReRankerPort {
  rerank(query: string, results: RetrievalResult[]): Promise<RetrievalResult[]>;
}

export interface HybridSearchOptions {
  sources: RetrievalPort[];
  k?: number;
}

export interface WeightedHybridOptions {
  sources: RetrievalPort[];
  weights?: number[];
  k?: number;
}

export interface ScoreThresholdReRankerOptions {
  minScore?: number;
  topK?: number;
}

export interface DocumentLoaderPort {
  load(source: string): RetrievalDocument[];
}

export interface QueryTransformerPort {
  transform(query: string): string | string[];
}

export interface MultiQueryTransformerOptions {
  templates?: string[];
}

export interface AugmentPromptOptions {
  maxContextLength?: number;
  template?: string;
  separator?: string;
  includeMetadata?: boolean;
  tokenizer?: TokenizerPort;
  maxContextTokens?: number;
}

export interface AugmentPrompt {
  augment(query: string, results: RetrievalResult[]): string;
}

export declare function assertRetrievalPort(adapter: unknown): void;
export declare function createChunker(options?: ChunkerOptions): Chunker;
export declare function createBm25Adapter(options?: Bm25AdapterOptions): RetrievalPort;
export declare function createVectorLocalAdapter(options?: VectorLocalAdapterOptions): RetrievalPort;
export declare function createAugmentPrompt(options?: AugmentPromptOptions): AugmentPrompt;
