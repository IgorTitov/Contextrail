/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit-test the hybrid search adapters (RRF and weighted) and score-threshold re-ranker in the retrieval hex module using fake in-memory retrieval backends.
 * @sidecar retrieval-hybrid-reranker.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for Hybrid Search and Re-ranker adapters.
 *
 * SpecRefs: TPL-110; TPL-111; TPL-112; TPL-113
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertRetrievalPort,
  assertReRankerPort,
  createHybridSearchAdapter,
  createWeightedHybridAdapter,
  createScoreThresholdReRanker,
} from '../../modules/retrieval/public-api.mjs';

// ---------------------------------------------------------------------------
// Helpers — fake retrieval adapters
// ---------------------------------------------------------------------------

function makeFakeRetrieval(results) {
  return {
    async addDocuments() {
      return [];
    },
    async search() {
      return results;
    },
    async removeDocuments() {
      return 0;
    },
    async clear() {},
  };
}

// ---------------------------------------------------------------------------
// createHybridSearchAdapter() — RRF fusion
// ---------------------------------------------------------------------------

describe('createHybridSearchAdapter()', () => {
  it('conforms to RetrievalPort', () => {
    const adapter = createHybridSearchAdapter({ sources: [] });
    assert.doesNotThrow(() => assertRetrievalPort(adapter));
  });

  it('returns empty results when no sources', async () => {
    const adapter = createHybridSearchAdapter({ sources: [] });
    const results = await adapter.search('test');
    assert.deepEqual(results, []);
  });

  it('merges results from multiple sources via RRF', async () => {
    const s1 = makeFakeRetrieval([
      { documentId: 'a', content: 'A', score: 0.9, metadata: {} },
      { documentId: 'b', content: 'B', score: 0.7, metadata: {} },
    ]);
    const s2 = makeFakeRetrieval([
      { documentId: 'b', content: 'B', score: 0.8, metadata: {} },
      { documentId: 'c', content: 'C', score: 0.6, metadata: {} },
    ]);
    const adapter = createHybridSearchAdapter({ sources: [s1, s2] });
    const results = await adapter.search('test');

    // 'b' appears in both sources — should rank highest
    assert.ok(results.length >= 2);
    assert.equal(results[0].documentId, 'b');
  });

  it('respects topK option', async () => {
    const s1 = makeFakeRetrieval([
      { documentId: 'a', content: 'A', score: 0.9, metadata: {} },
      { documentId: 'b', content: 'B', score: 0.8, metadata: {} },
      { documentId: 'c', content: 'C', score: 0.7, metadata: {} },
    ]);
    const adapter = createHybridSearchAdapter({ sources: [s1] });
    const results = await adapter.search('test', { topK: 2 });
    assert.equal(results.length, 2);
  });

  it('produces normalized scores between 0 and 1', async () => {
    const s1 = makeFakeRetrieval([{ documentId: 'a', content: 'A', score: 0.9, metadata: {} }]);
    const adapter = createHybridSearchAdapter({ sources: [s1] });
    const results = await adapter.search('test');
    for (const r of results) {
      assert.ok(r.score >= 0 && r.score <= 1, `score ${r.score} out of range`);
    }
  });

  it('delegates addDocuments to all sources', async () => {
    let calls = 0;
    const s = {
      ...makeFakeRetrieval([]),
      addDocuments: async () => {
        calls++;
        return [];
      },
    };
    const adapter = createHybridSearchAdapter({ sources: [s, s] });
    await adapter.addDocuments([{ content: 'test' }]);
    assert.equal(calls, 2);
  });

  it('delegates clear to all sources', async () => {
    let calls = 0;
    const s = {
      ...makeFakeRetrieval([]),
      clear: async () => {
        calls++;
      },
    };
    const adapter = createHybridSearchAdapter({ sources: [s, s] });
    await adapter.clear();
    assert.equal(calls, 2);
  });
});

// ---------------------------------------------------------------------------
// createWeightedHybridAdapter()
// ---------------------------------------------------------------------------

describe('createWeightedHybridAdapter()', () => {
  it('conforms to RetrievalPort', () => {
    const adapter = createWeightedHybridAdapter({ sources: [] });
    assert.doesNotThrow(() => assertRetrievalPort(adapter));
  });

  it('applies weights to RRF scores', async () => {
    const s1 = makeFakeRetrieval([{ documentId: 'a', content: 'A', score: 0.9, metadata: {} }]);
    const s2 = makeFakeRetrieval([{ documentId: 'b', content: 'B', score: 0.9, metadata: {} }]);
    // s1 has weight 10, s2 has weight 1 — 'a' should rank higher
    const adapter = createWeightedHybridAdapter({
      sources: [s1, s2],
      weights: [10, 1],
    });
    const results = await adapter.search('test');
    assert.equal(results[0].documentId, 'a');
  });

  it('defaults to equal weights', async () => {
    const s1 = makeFakeRetrieval([{ documentId: 'a', content: 'A', score: 0.9, metadata: {} }]);
    const adapter = createWeightedHybridAdapter({ sources: [s1] });
    const results = await adapter.search('test');
    assert.ok(results.length >= 1);
  });
});

// ---------------------------------------------------------------------------
// assertReRankerPort()
// ---------------------------------------------------------------------------

describe('assertReRankerPort()', () => {
  it('accepts a valid re-ranker', () => {
    const rr = { rerank: async () => [] };
    assert.doesNotThrow(() => assertReRankerPort(rr));
  });

  it('rejects null', () => {
    assert.throws(() => assertReRankerPort(null), TypeError);
  });

  it('rejects object without rerank', () => {
    assert.throws(() => assertReRankerPort({}), TypeError);
  });
});

// ---------------------------------------------------------------------------
// createScoreThresholdReRanker()
// ---------------------------------------------------------------------------

describe('createScoreThresholdReRanker()', () => {
  it('conforms to ReRankerPort', () => {
    const rr = createScoreThresholdReRanker();
    assert.doesNotThrow(() => assertReRankerPort(rr));
  });

  it('filters results below threshold', async () => {
    const rr = createScoreThresholdReRanker({ minScore: 0.5 });
    const results = await rr.rerank('test', [
      { documentId: 'a', content: 'A', score: 0.9, metadata: {} },
      { documentId: 'b', content: 'B', score: 0.3, metadata: {} },
      { documentId: 'c', content: 'C', score: 0.6, metadata: {} },
    ]);
    assert.equal(results.length, 2);
    assert.ok(results.every((r) => r.score >= 0.5));
  });

  it('preserves order (score descending)', async () => {
    const rr = createScoreThresholdReRanker({ minScore: 0 });
    const results = await rr.rerank('test', [
      { documentId: 'a', content: 'A', score: 0.5, metadata: {} },
      { documentId: 'b', content: 'B', score: 0.9, metadata: {} },
      { documentId: 'c', content: 'C', score: 0.7, metadata: {} },
    ]);
    assert.equal(results[0].documentId, 'b');
    assert.equal(results[1].documentId, 'c');
    assert.equal(results[2].documentId, 'a');
  });

  it('returns empty array when all below threshold', async () => {
    const rr = createScoreThresholdReRanker({ minScore: 0.99 });
    const results = await rr.rerank('test', [
      { documentId: 'a', content: 'A', score: 0.5, metadata: {} },
    ]);
    assert.equal(results.length, 0);
  });

  it('defaults minScore to 0', async () => {
    const rr = createScoreThresholdReRanker();
    const results = await rr.rerank('test', [
      { documentId: 'a', content: 'A', score: 0.01, metadata: {} },
    ]);
    assert.equal(results.length, 1);
  });

  it('respects topK option', async () => {
    const rr = createScoreThresholdReRanker({ minScore: 0, topK: 1 });
    const results = await rr.rerank('test', [
      { documentId: 'a', content: 'A', score: 0.9, metadata: {} },
      { documentId: 'b', content: 'B', score: 0.8, metadata: {} },
    ]);
    assert.equal(results.length, 1);
  });
});
