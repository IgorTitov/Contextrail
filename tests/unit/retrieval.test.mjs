/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove pure-logic contracts for the retrieval module -- port assertion, chunker, BM25 adapter, vector-local adapter, and augmentPrompt pipeline.
 * @sidecar retrieval.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the retrieval module.
 * All imports go through the public API.
 *
 * SpecRefs: TPL-087; TPL-088; TPL-089; TPL-090; TPL-091; TPL-092
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertRetrievalPort,
  createChunker,
  createBm25Adapter,
  createVectorLocalAdapter,
  createAugmentPrompt,
} from '../../modules/retrieval/public-api.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal conformant adapter stub for port assertion tests. */
function stubAdapter() {
  return {
    addDocuments: async () => [],
    search: async () => [],
    removeDocuments: async () => 0,
    clear: async () => {},
  };
}

// ---------------------------------------------------------------------------
// Port assertion (TPL-087)
// ---------------------------------------------------------------------------

describe('assertRetrievalPort', () => {
  test('rejects null', () => {
    assert.throws(() => assertRetrievalPort(null), /non-null object/);
  });

  test('rejects non-object', () => {
    assert.throws(() => assertRetrievalPort('string'), /non-null object/);
  });

  test('rejects undefined', () => {
    assert.throws(() => assertRetrievalPort(undefined), /non-null object/);
  });

  test('rejects object missing addDocuments', () => {
    const a = stubAdapter();
    delete a.addDocuments;
    assert.throws(() => assertRetrievalPort(a), /addDocuments/);
  });

  test('rejects object missing search', () => {
    const a = stubAdapter();
    delete a.search;
    assert.throws(() => assertRetrievalPort(a), /search/);
  });

  test('rejects object missing removeDocuments', () => {
    const a = stubAdapter();
    delete a.removeDocuments;
    assert.throws(() => assertRetrievalPort(a), /removeDocuments/);
  });

  test('rejects object missing clear', () => {
    const a = stubAdapter();
    delete a.clear;
    assert.throws(() => assertRetrievalPort(a), /clear/);
  });

  test('accepts conformant adapter', () => {
    assert.doesNotThrow(() => assertRetrievalPort(stubAdapter()));
  });
});

// ---------------------------------------------------------------------------
// Chunker (TPL-088)
// ---------------------------------------------------------------------------

describe('createChunker', () => {
  test('returns object with chunk method', () => {
    const chunker = createChunker();
    assert.equal(typeof chunker.chunk, 'function');
  });

  test('returns empty array for empty text', () => {
    const chunker = createChunker();
    const result = chunker.chunk('', 'doc-1');
    assert.deepEqual(result, []);
  });

  test('returns single chunk for text shorter than chunkSize', () => {
    const chunker = createChunker({ chunkSize: 100 });
    const result = chunker.chunk('Hello world.', 'doc-1');
    assert.equal(result.length, 1);
    assert.equal(result[0].documentId, 'doc-1');
    assert.equal(result[0].chunkIndex, 0);
    assert.equal(result[0].content, 'Hello world.');
    assert.equal(result[0].startOffset, 0);
    assert.equal(result[0].endOffset, 12);
  });

  test('splits text into overlapping chunks', () => {
    const text = 'A'.repeat(100);
    const chunker = createChunker({ chunkSize: 40, chunkOverlap: 10 });
    const result = chunker.chunk(text, 'doc-1');
    // chunks: 0-40, 30-70, 60-100 => 3 chunks with overlap of 10
    assert.ok(result.length >= 3);
    // Each chunk should have correct documentId
    for (const chunk of result) {
      assert.equal(chunk.documentId, 'doc-1');
    }
    // Chunk indices should be sequential
    for (let i = 0; i < result.length; i++) {
      assert.equal(result[i].chunkIndex, i);
    }
  });

  test('character offsets are accurate', () => {
    const text =
      'The quick brown fox jumps over the lazy dog. Sphinx of black quartz judge my vow.';
    const chunker = createChunker({ chunkSize: 30, chunkOverlap: 5 });
    const result = chunker.chunk(text, 'doc-1');
    for (const chunk of result) {
      assert.equal(
        chunk.content,
        text.slice(chunk.startOffset, chunk.endOffset),
        `Offset mismatch for chunk ${chunk.chunkIndex}`,
      );
    }
  });

  test('handles very long single token without infinite loop', () => {
    const text = 'A'.repeat(200);
    const chunker = createChunker({ chunkSize: 50, chunkOverlap: 10 });
    const result = chunker.chunk(text, 'doc-1');
    assert.ok(result.length > 1, 'Should produce multiple chunks');
    // All text should be covered
    assert.equal(result[0].startOffset, 0);
    assert.equal(result[result.length - 1].endOffset, 200);
  });

  test('default chunkSize is 512', () => {
    const chunker = createChunker();
    const text = 'A'.repeat(600);
    const result = chunker.chunk(text, 'doc-1');
    assert.ok(result.length >= 2);
    assert.ok(result[0].content.length <= 512);
  });

  test('chunks include metadata with empty object by default', () => {
    const chunker = createChunker({ chunkSize: 100 });
    const result = chunker.chunk('Some text.', 'doc-1');
    assert.ok(result[0].metadata !== undefined);
    assert.deepEqual(result[0].metadata, {});
  });
});

// ---------------------------------------------------------------------------
// BM25 Adapter (TPL-089)
// ---------------------------------------------------------------------------

describe('createBm25Adapter', () => {
  test('passes assertRetrievalPort', () => {
    const adapter = createBm25Adapter();
    assert.doesNotThrow(() => assertRetrievalPort(adapter));
  });

  test('addDocuments returns document IDs', async () => {
    const adapter = createBm25Adapter();
    const ids = await adapter.addDocuments([
      { id: 'doc-1', content: 'hello world' },
      { content: 'auto id test' },
    ]);
    assert.equal(ids.length, 2);
    assert.equal(ids[0], 'doc-1');
    assert.ok(typeof ids[1] === 'string' && ids[1].length > 0, 'auto-generates ID');
  });

  test('search returns ranked results', async () => {
    const adapter = createBm25Adapter();
    await adapter.addDocuments([
      { id: 'a', content: 'the quick brown fox' },
      { id: 'b', content: 'the lazy brown dog' },
      { id: 'c', content: 'fox jumps over something' },
    ]);
    const results = await adapter.search('brown fox');
    assert.ok(results.length > 0);
    // Result with both terms should rank higher
    assert.equal(results[0].documentId, 'a');
    // Scores should be 0-1
    for (const r of results) {
      assert.ok(r.score >= 0 && r.score <= 1, `Score ${r.score} out of [0, 1]`);
    }
  });

  test('search respects topK option', async () => {
    const adapter = createBm25Adapter();
    await adapter.addDocuments([
      { id: 'a', content: 'apple banana cherry' },
      { id: 'b', content: 'apple banana' },
      { id: 'c', content: 'apple' },
    ]);
    const results = await adapter.search('apple', { topK: 2 });
    assert.ok(results.length <= 2);
  });

  test('search respects minScore threshold', async () => {
    const adapter = createBm25Adapter();
    await adapter.addDocuments([
      { id: 'a', content: 'machine learning artificial intelligence' },
      { id: 'b', content: 'cooking recipes dinner' },
    ]);
    const results = await adapter.search('machine learning', { minScore: 0.01 });
    // Only the relevant doc should pass
    for (const r of results) {
      assert.ok(r.score >= 0.01);
    }
  });

  test('search supports metadata filtering', async () => {
    const adapter = createBm25Adapter();
    await adapter.addDocuments([
      { id: 'a', content: 'typescript programming', metadata: { lang: 'en' } },
      { id: 'b', content: 'typescript coding', metadata: { lang: 'fr' } },
    ]);
    const results = await adapter.search('typescript', { filter: { lang: 'en' } });
    assert.equal(results.length, 1);
    assert.equal(results[0].documentId, 'a');
  });

  test('removeDocuments removes from index and returns count', async () => {
    const adapter = createBm25Adapter();
    await adapter.addDocuments([
      { id: 'a', content: 'hello' },
      { id: 'b', content: 'world' },
    ]);
    const removed = await adapter.removeDocuments(['a']);
    assert.equal(removed, 1);
    const results = await adapter.search('hello');
    assert.equal(results.length, 0);
  });

  test('clear resets the entire index', async () => {
    const adapter = createBm25Adapter();
    await adapter.addDocuments([{ id: 'a', content: 'hello world' }]);
    await adapter.clear();
    const results = await adapter.search('hello');
    assert.equal(results.length, 0);
  });

  test('factory calls produce independent instances', async () => {
    const a1 = createBm25Adapter();
    const a2 = createBm25Adapter();
    await a1.addDocuments([{ id: 'x', content: 'shared term' }]);
    const results = await a2.search('shared');
    assert.equal(results.length, 0);
  });

  test('default topK is 5', async () => {
    const adapter = createBm25Adapter();
    const docs = Array.from({ length: 10 }, (_, i) => ({
      id: `d${i}`,
      content: `common word document ${i}`,
    }));
    await adapter.addDocuments(docs);
    const results = await adapter.search('common word');
    assert.ok(results.length <= 5);
  });

  test('BM25 parameters k1 and b are configurable', async () => {
    const a1 = createBm25Adapter({ k1: 0.5, b: 0.25 });
    const a2 = createBm25Adapter({ k1: 2.0, b: 1.0 });
    const docs = [
      { id: 'a', content: 'word word word word extra' },
      { id: 'b', content: 'word other' },
    ];
    await a1.addDocuments(docs);
    await a2.addDocuments(docs);
    const r1 = await a1.search('word', { topK: 10 });
    const r2 = await a2.search('word', { topK: 10 });
    // Both should return results, but scores will differ due to params
    assert.ok(r1.length > 0);
    assert.ok(r2.length > 0);
  });

  test('search returns empty array when no documents match', async () => {
    const adapter = createBm25Adapter();
    await adapter.addDocuments([{ id: 'a', content: 'hello world' }]);
    const results = await adapter.search('nonexistent');
    assert.equal(results.length, 0);
  });

  test('tokenizer handles punctuation and case', async () => {
    const adapter = createBm25Adapter();
    await adapter.addDocuments([{ id: 'a', content: 'Hello, World! This is a TEST.' }]);
    const results = await adapter.search('hello world test');
    assert.ok(results.length > 0, 'Should find despite case/punctuation');
  });
});

// ---------------------------------------------------------------------------
// Vector-Local Adapter (TPL-090)
// ---------------------------------------------------------------------------

describe('createVectorLocalAdapter', () => {
  /** Simple embedding helper: one-hot-ish vectors for testing. */
  function embed(values) {
    return new Float32Array(values);
  }

  test('passes assertRetrievalPort', () => {
    const adapter = createVectorLocalAdapter();
    assert.doesNotThrow(() => assertRetrievalPort(adapter));
  });

  test('addDocuments stores documents with embeddings', async () => {
    const adapter = createVectorLocalAdapter();
    const ids = await adapter.addDocuments([
      { id: 'a', content: 'hello', metadata: { embedding: embed([1, 0, 0]) } },
      { content: 'world', metadata: { embedding: embed([0, 1, 0]) } },
    ]);
    assert.equal(ids.length, 2);
    assert.equal(ids[0], 'a');
    assert.ok(typeof ids[1] === 'string');
  });

  test('addDocuments throws when embedding is missing', async () => {
    const adapter = createVectorLocalAdapter();
    await assert.rejects(
      () => adapter.addDocuments([{ id: 'a', content: 'no embedding' }]),
      /embedding/i,
    );
  });

  test('addDocuments validates dimensionality consistency', async () => {
    const adapter = createVectorLocalAdapter();
    await adapter.addDocuments([
      { id: 'a', content: 'dim3', metadata: { embedding: embed([1, 0, 0]) } },
    ]);
    await assert.rejects(
      () =>
        adapter.addDocuments([
          { id: 'b', content: 'dim2', metadata: { embedding: embed([1, 0]) } },
        ]),
      /dimension/i,
    );
  });

  test('search computes cosine similarity correctly', async () => {
    const adapter = createVectorLocalAdapter();
    await adapter.addDocuments([
      { id: 'a', content: 'close', metadata: { embedding: embed([1, 0, 0]) } },
      { id: 'b', content: 'far', metadata: { embedding: embed([0, 1, 0]) } },
      { id: 'c', content: 'mid', metadata: { embedding: embed([0.7, 0.7, 0]) } },
    ]);
    const results = await adapter.search('query', {
      queryEmbedding: embed([1, 0, 0]),
      topK: 3,
    });
    assert.ok(results.length > 0);
    // 'close' should rank highest (identical direction)
    assert.equal(results[0].documentId, 'a');
    // Scores should be 0-1
    for (const r of results) {
      assert.ok(r.score >= 0 && r.score <= 1, `Score ${r.score} out of [0, 1]`);
    }
  });

  test('search requires queryEmbedding', async () => {
    const adapter = createVectorLocalAdapter();
    await adapter.addDocuments([
      { id: 'a', content: 'test', metadata: { embedding: embed([1, 0]) } },
    ]);
    await assert.rejects(() => adapter.search('query'), /queryEmbedding/i);
  });

  test('search validates queryEmbedding dimensionality', async () => {
    const adapter = createVectorLocalAdapter();
    await adapter.addDocuments([
      { id: 'a', content: 'test', metadata: { embedding: embed([1, 0, 0]) } },
    ]);
    await assert.rejects(
      () => adapter.search('query', { queryEmbedding: embed([1, 0]) }),
      /dimension/i,
    );
  });

  test('search respects topK', async () => {
    const adapter = createVectorLocalAdapter();
    await adapter.addDocuments([
      { id: 'a', content: 'a', metadata: { embedding: embed([1, 0]) } },
      { id: 'b', content: 'b', metadata: { embedding: embed([0.9, 0.1]) } },
      { id: 'c', content: 'c', metadata: { embedding: embed([0.8, 0.2]) } },
    ]);
    const results = await adapter.search('q', {
      queryEmbedding: embed([1, 0]),
      topK: 2,
    });
    assert.ok(results.length <= 2);
  });

  test('search respects minScore', async () => {
    const adapter = createVectorLocalAdapter();
    await adapter.addDocuments([
      { id: 'a', content: 'close', metadata: { embedding: embed([1, 0]) } },
      { id: 'b', content: 'orthogonal', metadata: { embedding: embed([0, 1]) } },
    ]);
    const results = await adapter.search('q', {
      queryEmbedding: embed([1, 0]),
      minScore: 0.5,
      topK: 10,
    });
    for (const r of results) {
      assert.ok(r.score >= 0.5);
    }
  });

  test('search supports metadata filtering', async () => {
    const adapter = createVectorLocalAdapter();
    await adapter.addDocuments([
      { id: 'a', content: 'a', metadata: { embedding: embed([1, 0]), lang: 'en' } },
      { id: 'b', content: 'b', metadata: { embedding: embed([0.9, 0.1]), lang: 'fr' } },
    ]);
    const results = await adapter.search('q', {
      queryEmbedding: embed([1, 0]),
      filter: { lang: 'en' },
      topK: 10,
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].documentId, 'a');
  });

  test('removeDocuments removes and returns count', async () => {
    const adapter = createVectorLocalAdapter();
    await adapter.addDocuments([
      { id: 'a', content: 'a', metadata: { embedding: embed([1, 0]) } },
      { id: 'b', content: 'b', metadata: { embedding: embed([0, 1]) } },
    ]);
    const count = await adapter.removeDocuments(['a']);
    assert.equal(count, 1);
    const results = await adapter.search('q', {
      queryEmbedding: embed([1, 0]),
      topK: 10,
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].documentId, 'b');
  });

  test('clear resets store and dimensionality', async () => {
    const adapter = createVectorLocalAdapter();
    await adapter.addDocuments([
      { id: 'a', content: 'a', metadata: { embedding: embed([1, 0, 0]) } },
    ]);
    await adapter.clear();
    // After clear, different dimensionality should be accepted
    const ids = await adapter.addDocuments([
      { id: 'b', content: 'b', metadata: { embedding: embed([1, 0]) } },
    ]);
    assert.equal(ids.length, 1);
  });

  test('factory calls produce independent instances', async () => {
    const a1 = createVectorLocalAdapter();
    const a2 = createVectorLocalAdapter();
    await a1.addDocuments([{ id: 'a', content: 'a', metadata: { embedding: embed([1, 0]) } }]);
    const results = await a2.search('q', {
      queryEmbedding: embed([1, 0]),
      topK: 10,
    });
    assert.equal(results.length, 0);
  });

  test('accepts number[] as embedding', async () => {
    const adapter = createVectorLocalAdapter();
    const ids = await adapter.addDocuments([
      { id: 'a', content: 'a', metadata: { embedding: [1, 0, 0] } },
    ]);
    assert.equal(ids.length, 1);
    const results = await adapter.search('q', {
      queryEmbedding: [1, 0, 0],
      topK: 5,
    });
    assert.ok(results.length > 0);
  });
});

// ---------------------------------------------------------------------------
// augmentPrompt Pipeline (TPL-091)
// ---------------------------------------------------------------------------

describe('createAugmentPrompt', () => {
  /** Helper: make a fake RetrievalResult. */
  function fakeResult(content, score, metadata = {}) {
    return {
      documentId: `doc-${Math.random().toString(36).slice(2, 6)}`,
      content,
      score,
      metadata,
    };
  }

  test('returns object with augment method', () => {
    const pipeline = createAugmentPrompt();
    assert.equal(typeof pipeline.augment, 'function');
  });

  test('augment returns string containing query and context', () => {
    const pipeline = createAugmentPrompt();
    const result = pipeline.augment('What is RAG?', [
      fakeResult('RAG is retrieval-augmented generation.', 0.9),
    ]);
    assert.ok(typeof result === 'string');
    assert.ok(result.includes('What is RAG?'), 'Should contain query');
    assert.ok(result.includes('RAG is retrieval-augmented generation.'), 'Should contain context');
  });

  test('handles empty results array', () => {
    const pipeline = createAugmentPrompt();
    const result = pipeline.augment('Hello?', []);
    assert.ok(typeof result === 'string');
    assert.ok(result.includes('Hello?'), 'Should still contain query');
  });

  test('results are ordered by score (highest first)', () => {
    const pipeline = createAugmentPrompt();
    const r1 = fakeResult('low relevance', 0.3);
    const r2 = fakeResult('high relevance', 0.9);
    const result = pipeline.augment('query', [r1, r2]);
    const highIdx = result.indexOf('high relevance');
    const lowIdx = result.indexOf('low relevance');
    assert.ok(highIdx < lowIdx, 'High-score result should appear before low-score');
  });

  test('drops low-ranked results when exceeding maxContextLength', () => {
    const pipeline = createAugmentPrompt({ maxContextLength: 50 });
    const results = [
      fakeResult('A'.repeat(30), 0.9),
      fakeResult('B'.repeat(30), 0.5),
      fakeResult('C'.repeat(30), 0.3),
    ];
    const output = pipeline.augment('query', results);
    assert.ok(output.includes('A'.repeat(30)), 'Should keep highest-ranked');
    // At least one low-ranked result should be dropped
    assert.ok(!output.includes('C'.repeat(30)), 'Should drop lowest-ranked');
  });

  test('supports custom template with {{context}} and {{query}}', () => {
    const pipeline = createAugmentPrompt({
      template: 'Context: {{context}}\nQuestion: {{query}}',
    });
    const result = pipeline.augment('What?', [fakeResult('Info.', 0.9)]);
    assert.ok(result.includes('Context:'));
    assert.ok(result.includes('Question: What?'));
    assert.ok(result.includes('Info.'));
  });

  test('includeMetadata adds metadata to context', () => {
    const pipeline = createAugmentPrompt({ includeMetadata: true });
    const result = pipeline.augment('query', [
      fakeResult('content', 0.9, { source: 'doc.pdf', page: 3 }),
    ]);
    assert.ok(result.includes('source'), 'Should include metadata key');
    assert.ok(result.includes('doc.pdf'), 'Should include metadata value');
  });

  test('default maxContextLength is 4000', () => {
    const pipeline = createAugmentPrompt();
    // Create results that exceed 4000 chars total
    const results = Array.from({ length: 20 }, (_, i) => fakeResult('X'.repeat(300), 1 - i * 0.04));
    const output = pipeline.augment('query', results);
    // Not all 20 results should be included (20*300 = 6000 > 4000)
    const countX = (output.match(/X{300}/g) || []).length;
    assert.ok(countX < 20, `Only ${countX} of 20 results should fit`);
  });

  test('produces deterministic output', () => {
    const pipeline = createAugmentPrompt();
    const results = [fakeResult('Hello', 0.8), fakeResult('World', 0.6)];
    const o1 = pipeline.augment('test', results);
    const o2 = pipeline.augment('test', results);
    assert.equal(o1, o2);
  });
});

// ---------------------------------------------------------------------------
// Messages / i18n (TPL-087)
// ---------------------------------------------------------------------------

describe('retrieval messages', () => {
  test('messages module is importable', async () => {
    const m = await import('../../modules/retrieval/messages.mjs');
    assert.equal(typeof m.t, 'function');
    assert.equal(typeof m.setLocale, 'function');
    assert.equal(typeof m.getLocale, 'function');
    assert.equal(typeof m.registerLocale, 'function');
    assert.equal(typeof m.resetLocale, 'function');
  });

  test('t returns key for unknown keys', async () => {
    const m = await import('../../modules/retrieval/messages.mjs');
    m.resetLocale();
    assert.equal(m.t('unknown.key'), 'unknown.key');
  });

  test('t substitutes parameters', async () => {
    const m = await import('../../modules/retrieval/messages.mjs');
    m.resetLocale();
    const msg = m.t('retrieval.error.embedding_missing', { id: 'doc-1' });
    assert.ok(msg.includes('doc-1'));
  });
});
