/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide TypeScript declarations for all five chunker.mjs exports — createCharacterChunker, createRecursiveCharacterChunker, createSentenceChunker, createMarkdownChunker, and the createChunker alias.
 * @sidecar chunker.d.ts.header.md
 * @layer module | @hex domain | @ctx retrieval
 * @public false
 * @edit sync-only
 */

/**
 * Type declarations for chunker.mjs
 *
 * SpecRefs: TPL-088; TPL-099; TPL-100; TPL-101; TPL-102
 */

import type {
  ChunkerOptions,
  ChunkerPort,
  RecursiveCharacterChunkerOptions,
  SentenceChunkerOptions,
  MarkdownChunkerOptions,
} from '../types.js';

export { createChunker } from '../types.js';
export declare function createCharacterChunker(options?: ChunkerOptions): ChunkerPort;
export declare function createRecursiveCharacterChunker(options?: RecursiveCharacterChunkerOptions): ChunkerPort;
export declare function createSentenceChunker(options?: SentenceChunkerOptions): ChunkerPort;
export declare function createMarkdownChunker(options?: MarkdownChunkerOptions): ChunkerPort;
