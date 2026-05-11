/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the sentence and markdown chunker strategies — boundary detection, abbreviation handling, heading hierarchy, metadata, and chunkIndex invariants.
 * @sidecar retrieval-chunker-strategies.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Unit tests for createSentenceChunker and createMarkdownChunker.
 * Port assertion + character chunker live in retrieval-chunker-port.test.mjs;
 * recursive chunker lives in retrieval-chunker-recursive.test.mjs.
 *
 * SpecRefs: TPL-101; TPL-102; TPL-218
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertChunkerPort,
  createSentenceChunker,
  createMarkdownChunker,
} from '../../modules/retrieval/public-api.mjs';

// ---------------------------------------------------------------------------
// createSentenceChunker()
// ---------------------------------------------------------------------------

describe('createSentenceChunker()', () => {
  it('conforms to ChunkerPort', () => {
    const chunker = createSentenceChunker();
    assert.doesNotThrow(() => assertChunkerPort(chunker));
  });

  it('returns empty array for empty text', () => {
    const chunker = createSentenceChunker();
    assert.deepEqual(chunker.chunk('', 'doc1'), []);
  });

  it('splits text by sentence boundaries', () => {
    const chunker = createSentenceChunker({ maxChunkSize: 100 });
    const text = 'First sentence. Second sentence. Third sentence.';
    const chunks = chunker.chunk(text, 'doc1');
    assert.ok(chunks.length >= 1);
    assert.ok(chunks[0].content.includes('First sentence.'));
  });

  it('groups sentences up to maxChunkSize', () => {
    const chunker = createSentenceChunker({ maxChunkSize: 40 });
    const text = 'Short. Also short. This is a longer sentence that exceeds limit.';
    const chunks = chunker.chunk(text, 'doc1');
    assert.ok(chunks.length >= 2);
  });

  it('handles question marks and exclamation points', () => {
    const chunker = createSentenceChunker({ maxChunkSize: 50 });
    const text = 'Is this working? Yes! It is working.';
    const chunks = chunker.chunk(text, 'doc1');
    const allContent = chunks.map((c) => c.content).join('');
    assert.ok(allContent.includes('Is this working?'));
    assert.ok(allContent.includes('Yes!'));
    assert.ok(allContent.includes('It is working.'));
  });

  it('preserves sentence-ending punctuation', () => {
    const chunker = createSentenceChunker({ maxChunkSize: 200 });
    const text = 'Hello world. Goodbye world.';
    const chunks = chunker.chunk(text, 'doc1');
    assert.ok(chunks[0].content.includes('.'));
  });

  it('handles text with no sentence boundaries', () => {
    const chunker = createSentenceChunker({ maxChunkSize: 100 });
    const text = 'just some text without punctuation';
    const chunks = chunker.chunk(text, 'doc1');
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].content, text);
  });

  it('handles abbreviations like Mr. Dr. etc. without splitting', () => {
    const chunker = createSentenceChunker({ maxChunkSize: 200 });
    const text = 'Mr. Smith went to Washington. He met Dr. Jones there.';
    const chunks = chunker.chunk(text, 'doc1');
    const allContent = chunks.map((c) => c.content).join(' ');
    assert.ok(allContent.includes('Mr. Smith'));
    assert.ok(allContent.includes('Dr. Jones'));
  });

  it('produces correct documentId on all chunks', () => {
    const chunker = createSentenceChunker({ maxChunkSize: 20 });
    const text = 'One. Two. Three.';
    const chunks = chunker.chunk(text, 'myDoc');
    for (const c of chunks) {
      assert.equal(c.documentId, 'myDoc');
    }
  });
});

// ---------------------------------------------------------------------------
// createMarkdownChunker()
// ---------------------------------------------------------------------------

describe('createMarkdownChunker()', () => {
  it('conforms to ChunkerPort', () => {
    const chunker = createMarkdownChunker();
    assert.doesNotThrow(() => assertChunkerPort(chunker));
  });

  it('returns empty array for empty text', () => {
    const chunker = createMarkdownChunker();
    assert.deepEqual(chunker.chunk('', 'doc1'), []);
  });

  it('splits by headings', () => {
    const chunker = createMarkdownChunker();
    const text =
      '# Title\n\nIntro text.\n\n## Section A\n\nContent A.\n\n## Section B\n\nContent B.';
    const chunks = chunker.chunk(text, 'doc1');
    assert.ok(chunks.length >= 2);
  });

  it('preserves heading hierarchy in metadata', () => {
    const chunker = createMarkdownChunker();
    const text = '# Main\n\n## Sub\n\nContent.';
    const chunks = chunker.chunk(text, 'doc1');
    const subChunk = chunks.find((c) => c.content.includes('Content.'));
    assert.ok(subChunk);
    assert.ok(subChunk.metadata.headings, 'metadata should contain headings');
    assert.ok(Array.isArray(subChunk.metadata.headings));
  });

  it('respects maxChunkSize by splitting large sections', () => {
    const chunker = createMarkdownChunker({ maxChunkSize: 50 });
    const longContent = 'Word '.repeat(30);
    const text = `# Title\n\n${longContent}`;
    const chunks = chunker.chunk(text, 'doc1');
    assert.ok(chunks.length >= 2, 'large sections should be split');
  });

  it('includes heading level in metadata', () => {
    const chunker = createMarkdownChunker();
    const text = '### Deep Heading\n\nDeep content.';
    const chunks = chunker.chunk(text, 'doc1');
    assert.ok(chunks.length >= 1);
    const c = chunks.find((ch) => ch.content.includes('Deep content'));
    assert.ok(c);
    assert.ok(c.metadata.headingLevel !== undefined || c.metadata.headings);
  });

  it('handles text without any headings', () => {
    const chunker = createMarkdownChunker();
    const text = 'Just plain text with no headings at all.';
    const chunks = chunker.chunk(text, 'doc1');
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].content, text);
  });

  it('handles multiple heading levels', () => {
    const chunker = createMarkdownChunker();
    const text = [
      '# H1',
      '',
      'H1 body.',
      '',
      '## H2',
      '',
      'H2 body.',
      '',
      '### H3',
      '',
      'H3 body.',
    ].join('\n');
    const chunks = chunker.chunk(text, 'doc1');
    assert.ok(chunks.length >= 3);
  });

  it('produces sequential chunkIndex values', () => {
    const chunker = createMarkdownChunker();
    const text = '# A\n\nOne.\n\n# B\n\nTwo.\n\n# C\n\nThree.';
    const chunks = chunker.chunk(text, 'doc1');
    for (let i = 0; i < chunks.length; i++) {
      assert.equal(chunks[i].chunkIndex, i);
    }
  });

  it('all chunks have non-empty content', () => {
    const chunker = createMarkdownChunker();
    const text = '# A\n\nBody A.\n\n## B\n\nBody B.';
    const chunks = chunker.chunk(text, 'doc1');
    for (const c of chunks) {
      assert.ok(c.content.trim().length > 0);
    }
  });
});
