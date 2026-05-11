/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of retrieval-test in this repository.
 * @sidecar retrieval.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for retrieval.feature.
 * Proves user-visible behavior through the retrieval module public API.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createCharacterChunker,
  createMarkdownChunker,
  createBm25Adapter,
  createAugmentPrompt,
  createCharCountTokenizer,
} from '../../modules/retrieval/public-api.mjs';

const feature = readFileSync(new URL('./features/retrieval.feature', import.meta.url), 'utf8');

describe('Feature: RAG retrieval pipeline', () => {
  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: RAG retrieval pipeline'));
    assert.ok(feature.includes('Scenario: Chunk text by character count'));
    assert.ok(feature.includes('Scenario: BM25 search returns ranked results'));
    assert.ok(feature.includes('Scenario: Augment prompt with retrieved context'));
    assert.ok(feature.includes('Scenario: Empty search returns no results'));
    assert.ok(feature.includes('Scenario: Markdown chunker splits on headings'));
  });

  test('Scenario: Chunk text by character count', () => {
    const chunker = createCharacterChunker({ chunkSize: 100, overlap: 0 });
    const chunks = chunker.chunk('A'.repeat(250));
    assert.ok(chunks.length >= 3);
  });

  test('Scenario: BM25 search returns ranked results', async () => {
    const bm25 = createBm25Adapter();
    await bm25.addDocuments([
      { id: '1', content: 'The quick brown fox jumps over the lazy dog', metadata: {} },
      { id: '2', content: 'A lazy cat sleeps on the mat', metadata: {} },
    ]);
    const results = await bm25.search('lazy dog');
    assert.ok(results.length > 0);
    assert.ok(results[0].score >= results[results.length - 1].score);
  });

  test('Scenario: Augment prompt with retrieved context', () => {
    const augmenter = createAugmentPrompt();
    const output = augmenter.augment('What is RAG?', [
      { id: '1', content: 'RAG combines retrieval and generation.', score: 0.9, metadata: {} },
    ]);
    assert.ok(output.includes('What is RAG?'));
    assert.ok(output.includes('RAG combines'));
  });

  test('Scenario: Empty search returns no results', async () => {
    const bm25 = createBm25Adapter();
    const results = await bm25.search('anything');
    assert.deepEqual(results, []);
  });

  test('Scenario: Markdown chunker splits on headings', () => {
    const chunker = createMarkdownChunker();
    const doc = '# Title\n\nParagraph one.\n\n## Section\n\nParagraph two.';
    const chunks = chunker.chunk(doc);
    assert.ok(chunks.length >= 2);
  });
});
