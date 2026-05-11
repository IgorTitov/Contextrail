/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the recursive character chunker — separator fallback (paragraph → line → sentence → space) and chunkSize / chunkIndex invariants.
 * @sidecar retrieval-chunker-recursive.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Unit tests for createRecursiveCharacterChunker.
 * Port assertion + character chunker live in retrieval-chunker-port.test.mjs;
 * sentence and markdown chunkers live in retrieval-chunker-strategies.test.mjs.
 *
 * SpecRefs: TPL-100; TPL-218
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertChunkerPort,
  createRecursiveCharacterChunker,
} from '../../modules/retrieval/public-api.mjs';

describe('createRecursiveCharacterChunker()', () => {
  it('conforms to ChunkerPort', () => {
    const chunker = createRecursiveCharacterChunker();
    assert.doesNotThrow(() => assertChunkerPort(chunker));
  });

  it('returns empty array for empty text', () => {
    const chunker = createRecursiveCharacterChunker();
    assert.deepEqual(chunker.chunk('', 'doc1'), []);
  });

  it('splits by double newline first', () => {
    const chunker = createRecursiveCharacterChunker({ chunkSize: 40 });
    const text = 'Paragraph one has enough text.\n\nParagraph two has enough text.';
    const chunks = chunker.chunk(text, 'doc1');
    assert.ok(chunks.length >= 2, `expected >=2 chunks, got ${chunks.length}`);
    assert.ok(chunks[0].content.includes('Paragraph one'));
    assert.ok(chunks[chunks.length - 1].content.includes('Paragraph two'));
  });

  it('falls back to single newline when paragraphs are too big', () => {
    const chunker = createRecursiveCharacterChunker({ chunkSize: 20 });
    const text = 'Line A is long\nLine B is long\nLine C is long\nLine D is long';
    const chunks = chunker.chunk(text, 'doc1');
    assert.ok(chunks.length >= 2, `expected >=2 chunks, got ${chunks.length}`);
    for (const c of chunks) {
      assert.ok(c.content.length <= 20, `chunk "${c.content}" exceeds limit`);
    }
  });

  it('falls back to sentence split when lines are too long', () => {
    const chunker = createRecursiveCharacterChunker({ chunkSize: 30 });
    const text = 'First sentence. Second sentence. Third sentence.';
    const chunks = chunker.chunk(text, 'doc1');
    assert.ok(chunks.length >= 2);
  });

  it('falls back to space split for very long sentences', () => {
    const chunker = createRecursiveCharacterChunker({ chunkSize: 15 });
    const text = 'one two three four five six seven eight';
    const chunks = chunker.chunk(text, 'doc1');
    assert.ok(chunks.length >= 2);
    for (const c of chunks) {
      assert.ok(c.content.length <= 15, `chunk "${c.content}" exceeds limit`);
    }
  });

  it('handles text shorter than chunkSize as a single chunk', () => {
    const chunker = createRecursiveCharacterChunker({ chunkSize: 1000 });
    const text = 'Short text.';
    const chunks = chunker.chunk(text, 'doc1');
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].content, 'Short text.');
  });

  it('produces sequential chunkIndex values', () => {
    const chunker = createRecursiveCharacterChunker({ chunkSize: 20 });
    const text = 'Part one.\n\nPart two.\n\nPart three.';
    const chunks = chunker.chunk(text, 'doc1');
    for (let i = 0; i < chunks.length; i++) {
      assert.equal(chunks[i].chunkIndex, i);
    }
  });

  it('accepts custom separators', () => {
    const chunker = createRecursiveCharacterChunker({
      chunkSize: 20,
      separators: ['||', ' '],
    });
    const text = 'Part A||Part B||Part C';
    const chunks = chunker.chunk(text, 'doc1');
    assert.ok(chunks.length >= 2);
    assert.ok(chunks[0].content.includes('Part A'));
  });

  it('produces non-empty content in every chunk', () => {
    const chunker = createRecursiveCharacterChunker({ chunkSize: 50 });
    const text = 'Hello.\n\n\n\nWorld.\n\nEnd.';
    const chunks = chunker.chunk(text, 'doc1');
    for (const c of chunks) {
      assert.ok(c.content.trim().length > 0, 'chunk must have non-empty content');
    }
  });
});
