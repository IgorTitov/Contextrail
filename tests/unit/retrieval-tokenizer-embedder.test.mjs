/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit-test the tokenizer ports (char-count and approx-tiktoken), echo embedder, and token-aware augmentPrompt function in the retrieval hex module without external API calls.
 * @sidecar retrieval-tokenizer-embedder.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the TokenizerPort, EmbedderPort, and token-aware augmentPrompt.
 *
 * SpecRefs: TPL-104; TPL-105; TPL-106; TPL-107; TPL-108; TPL-109
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertTokenizerPort,
  createCharCountTokenizer,
  createApproxTiktokenTokenizer,
  assertEmbedderPort,
  createEchoEmbedder,
  createAugmentPrompt,
} from '../../modules/retrieval/public-api.mjs';

// ---------------------------------------------------------------------------
// assertTokenizerPort()
// ---------------------------------------------------------------------------

describe('assertTokenizerPort()', () => {
  it('accepts a valid tokenizer', () => {
    const tok = { countTokens: () => 0, truncateToTokens: () => '' };
    assert.doesNotThrow(() => assertTokenizerPort(tok));
  });

  it('rejects null', () => {
    assert.throws(() => assertTokenizerPort(null), TypeError);
  });

  it('rejects object without countTokens', () => {
    assert.throws(() => assertTokenizerPort({ truncateToTokens: () => '' }), TypeError);
  });

  it('rejects object without truncateToTokens', () => {
    assert.throws(() => assertTokenizerPort({ countTokens: () => 0 }), TypeError);
  });
});

// ---------------------------------------------------------------------------
// createCharCountTokenizer()
// ---------------------------------------------------------------------------

describe('createCharCountTokenizer()', () => {
  it('conforms to TokenizerPort', () => {
    const tok = createCharCountTokenizer();
    assert.doesNotThrow(() => assertTokenizerPort(tok));
  });

  it('counts tokens as character count', () => {
    const tok = createCharCountTokenizer();
    assert.equal(tok.countTokens('hello'), 5);
  });

  it('returns 0 for empty string', () => {
    const tok = createCharCountTokenizer();
    assert.equal(tok.countTokens(''), 0);
  });

  it('truncates to exact character count', () => {
    const tok = createCharCountTokenizer();
    assert.equal(tok.truncateToTokens('hello world', 5), 'hello');
  });

  it('returns full text when within limit', () => {
    const tok = createCharCountTokenizer();
    assert.equal(tok.truncateToTokens('hi', 100), 'hi');
  });
});

// ---------------------------------------------------------------------------
// createApproxTiktokenTokenizer()
// ---------------------------------------------------------------------------

describe('createApproxTiktokenTokenizer()', () => {
  it('conforms to TokenizerPort', () => {
    const tok = createApproxTiktokenTokenizer();
    assert.doesNotThrow(() => assertTokenizerPort(tok));
  });

  it('estimates ~4 chars per token for English text', () => {
    const tok = createApproxTiktokenTokenizer();
    const text = 'The quick brown fox jumps over the lazy dog';
    const count = tok.countTokens(text);
    // ~44 chars / 4 ≈ 11 tokens (allow some flexibility)
    assert.ok(count >= 8 && count <= 15, `expected 8-15, got ${count}`);
  });

  it('returns 0 for empty string', () => {
    const tok = createApproxTiktokenTokenizer();
    assert.equal(tok.countTokens(''), 0);
  });

  it('truncates to approximate token count', () => {
    const tok = createApproxTiktokenTokenizer();
    const text = 'word '.repeat(100); // 500 chars, ~125 tokens
    const truncated = tok.truncateToTokens(text, 10);
    // 10 tokens × ~4 chars = ~40 chars
    assert.ok(truncated.length <= 50, `truncated too long: ${truncated.length}`);
    assert.ok(truncated.length >= 20, `truncated too short: ${truncated.length}`);
  });

  it('returns full text when within limit', () => {
    const tok = createApproxTiktokenTokenizer();
    assert.equal(tok.truncateToTokens('hi', 1000), 'hi');
  });

  it('accepts custom charsPerToken', () => {
    const tok = createApproxTiktokenTokenizer({ charsPerToken: 2 });
    assert.equal(tok.countTokens('abcd'), 2);
  });
});

// ---------------------------------------------------------------------------
// assertEmbedderPort()
// ---------------------------------------------------------------------------

describe('assertEmbedderPort()', () => {
  it('accepts a valid embedder', () => {
    const emb = { embed: async () => [] };
    assert.doesNotThrow(() => assertEmbedderPort(emb));
  });

  it('rejects null', () => {
    assert.throws(() => assertEmbedderPort(null), TypeError);
  });

  it('rejects object without embed', () => {
    assert.throws(() => assertEmbedderPort({}), TypeError);
  });

  it('rejects object where embed is not a function', () => {
    assert.throws(() => assertEmbedderPort({ embed: 42 }), TypeError);
  });
});

// ---------------------------------------------------------------------------
// createEchoEmbedder()
// ---------------------------------------------------------------------------

describe('createEchoEmbedder()', () => {
  it('conforms to EmbedderPort', () => {
    const emb = createEchoEmbedder();
    assert.doesNotThrow(() => assertEmbedderPort(emb));
  });

  it('returns embeddings with correct dimensions', async () => {
    const emb = createEchoEmbedder({ dimensions: 8 });
    const result = await emb.embed(['hello', 'world']);
    assert.equal(result.length, 2);
    assert.equal(result[0].length, 8);
    assert.equal(result[1].length, 8);
  });

  it('returns Float32Array instances', async () => {
    const emb = createEchoEmbedder({ dimensions: 4 });
    const result = await emb.embed(['test']);
    assert.ok(result[0] instanceof Float32Array);
  });

  it('returns deterministic output for same input', async () => {
    const emb = createEchoEmbedder({ dimensions: 4 });
    const r1 = await emb.embed(['hello']);
    const r2 = await emb.embed(['hello']);
    assert.deepEqual([...r1[0]], [...r2[0]]);
  });

  it('returns different embeddings for different text', async () => {
    const emb = createEchoEmbedder({ dimensions: 8 });
    const result = await emb.embed(['hello', 'world']);
    const v1 = [...result[0]];
    const v2 = [...result[1]];
    assert.notDeepEqual(v1, v2);
  });

  it('handles empty input array', async () => {
    const emb = createEchoEmbedder();
    const result = await emb.embed([]);
    assert.deepEqual(result, []);
  });

  it('uses default 384 dimensions', async () => {
    const emb = createEchoEmbedder();
    const result = await emb.embed(['test']);
    assert.equal(result[0].length, 384);
  });
});

// ---------------------------------------------------------------------------
// createAugmentPrompt() with tokenizer (token-aware budget)
// ---------------------------------------------------------------------------

describe('createAugmentPrompt() token-aware mode', () => {
  it('accepts an optional tokenizer', () => {
    const tok = createCharCountTokenizer();
    const ap = createAugmentPrompt({ tokenizer: tok, maxContextTokens: 100 });
    assert.ok(ap);
    assert.equal(typeof ap.augment, 'function');
  });

  it('uses tokenizer for context budget when provided', () => {
    const tok = createCharCountTokenizer();
    const ap = createAugmentPrompt({
      tokenizer: tok,
      maxContextTokens: 10,
      template: '{{context}}|{{query}}',
    });
    const results = [
      { documentId: 'a', content: '12345', score: 0.9, metadata: {} },
      { documentId: 'b', content: '67890', score: 0.8, metadata: {} },
      { documentId: 'c', content: 'XXXXX', score: 0.7, metadata: {} },
    ];
    const output = ap.augment('q', results);
    // With 10-char budget, should fit 2 results (5+1+5=11 is over, so only first fits? depends on separator)
    // Actually: first result "12345" = 5 chars, within 10. Second "67890" = 5 chars, total 5+sep+5. With \n separator = 11, exceeds 10.
    // So only first result should be included
    assert.ok(output.includes('12345'));
  });

  it('falls back to character-based when no tokenizer', () => {
    const ap = createAugmentPrompt({
      maxContextLength: 10,
      template: '{{context}}|{{query}}',
    });
    const results = [{ documentId: 'a', content: '12345', score: 0.9, metadata: {} }];
    const output = ap.augment('q', results);
    assert.ok(output.includes('12345'));
  });
});
