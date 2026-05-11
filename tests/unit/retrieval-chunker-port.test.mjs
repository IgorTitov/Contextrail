/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the ChunkerPort contract validator and the simple character chunker (plus its createChunker backward-compat alias).
 * @sidecar retrieval-chunker-port.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the ChunkerPort contract and the character chunker.
 * Recursive chunker tests live in retrieval-chunker-recursive.test.mjs;
 * sentence and markdown chunkers live in retrieval-chunker-strategies.test.mjs.
 *
 * SpecRefs: TPL-098; TPL-099; TPL-218
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertChunkerPort,
  createCharacterChunker,
  createChunker,
} from '../../modules/retrieval/public-api.mjs';

// ---------------------------------------------------------------------------
// assertChunkerPort() — port contract validation
// ---------------------------------------------------------------------------

describe('assertChunkerPort()', () => {
  it('accepts a valid chunker', () => {
    const chunker = { chunk: () => [] };
    assert.doesNotThrow(() => assertChunkerPort(chunker));
  });

  it('rejects null', () => {
    assert.throws(() => assertChunkerPort(null), TypeError);
  });

  it('rejects undefined', () => {
    assert.throws(() => assertChunkerPort(undefined), TypeError);
  });

  it('rejects a non-object', () => {
    assert.throws(() => assertChunkerPort('not an object'), TypeError);
  });

  it('rejects object without chunk method', () => {
    assert.throws(() => assertChunkerPort({}), TypeError);
  });

  it('rejects object where chunk is not a function', () => {
    assert.throws(() => assertChunkerPort({ chunk: 42 }), TypeError);
  });
});

// ---------------------------------------------------------------------------
// createCharacterChunker() — refactored existing chunker
// ---------------------------------------------------------------------------

describe('createCharacterChunker()', () => {
  it('conforms to ChunkerPort', () => {
    const chunker = createCharacterChunker();
    assert.doesNotThrow(() => assertChunkerPort(chunker));
  });

  it('returns empty array for empty text', () => {
    const chunker = createCharacterChunker();
    assert.deepEqual(chunker.chunk('', 'doc1'), []);
  });

  it('returns empty array for null text', () => {
    const chunker = createCharacterChunker();
    assert.deepEqual(chunker.chunk(null, 'doc1'), []);
  });

  it('chunks text with default options', () => {
    const chunker = createCharacterChunker();
    const text = 'a'.repeat(1024);
    const chunks = chunker.chunk(text, 'doc1');
    assert.ok(chunks.length >= 2);
    assert.equal(chunks[0].documentId, 'doc1');
    assert.equal(chunks[0].chunkIndex, 0);
    assert.equal(chunks[0].startOffset, 0);
  });

  it('respects chunkSize option', () => {
    const chunker = createCharacterChunker({ chunkSize: 10, chunkOverlap: 0 });
    const chunks = chunker.chunk('abcdefghijklmnopqrst', 'doc1');
    assert.equal(chunks[0].content, 'abcdefghij');
    assert.equal(chunks[1].content, 'klmnopqrst');
  });

  it('respects chunkOverlap option', () => {
    const chunker = createCharacterChunker({ chunkSize: 10, chunkOverlap: 3 });
    const chunks = chunker.chunk('abcdefghijklmnopqrst', 'doc1');
    assert.equal(chunks[0].content, 'abcdefghij');
    assert.equal(chunks[1].startOffset, 7);
    assert.ok(chunks[1].content.startsWith('hijklmnopq'));
  });

  it('produces correct offsets', () => {
    const chunker = createCharacterChunker({ chunkSize: 5, chunkOverlap: 0 });
    const chunks = chunker.chunk('0123456789', 'doc1');
    assert.equal(chunks[0].startOffset, 0);
    assert.equal(chunks[0].endOffset, 5);
    assert.equal(chunks[1].startOffset, 5);
    assert.equal(chunks[1].endOffset, 10);
  });

  it('includes metadata object on each chunk', () => {
    const chunker = createCharacterChunker({ chunkSize: 100 });
    const chunks = chunker.chunk('hello', 'doc1');
    assert.ok(typeof chunks[0].metadata === 'object');
  });
});

// ---------------------------------------------------------------------------
// createChunker() — backward-compatible alias
// ---------------------------------------------------------------------------

describe('createChunker() backward compatibility', () => {
  it('still exports createChunker', () => {
    assert.equal(typeof createChunker, 'function');
  });

  it('produces a valid chunker', () => {
    const chunker = createChunker();
    assert.doesNotThrow(() => assertChunkerPort(chunker));
  });
});
