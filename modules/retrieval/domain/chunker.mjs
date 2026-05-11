/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Re-export barrel for all four chunker strategy factories — character, recursive, sentence, and markdown — plus the backward-compatible createChunker alias.
 * @sidecar chunker.mjs.header.md
 * @layer module | @hex domain | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Re-export barrel for chunker strategies.
 * Individual implementations live in dedicated files for maintainability.
 *
 * SpecRefs: TPL-088; TPL-099; TPL-100; TPL-101; TPL-102
 */

export { createCharacterChunker, createChunker } from './character-chunker.mjs';
export { createRecursiveCharacterChunker } from './recursive-character-chunker.mjs';
export { createSentenceChunker } from './sentence-chunker.mjs';
export { createMarkdownChunker } from './markdown-chunker.mjs';
