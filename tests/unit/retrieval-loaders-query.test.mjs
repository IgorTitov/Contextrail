/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit-test the document loader adapters (plain text, Markdown, HTML) and query transformer adapters (passthrough, multi-query) in the retrieval hex module using inline string fixtures.
 * @sidecar retrieval-loaders-query.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for Document Loaders and Query Pipeline.
 *
 * SpecRefs: TPL-122; TPL-123; TPL-124; TPL-125; TPL-126; TPL-127
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertDocumentLoaderPort,
  assertQueryTransformerPort,
  createPlainTextLoader,
  createMarkdownLoader,
  createHtmlLoader,
  createPassthroughTransformer,
  createMultiQueryTransformer,
} from '../../modules/retrieval/public-api.mjs';

// ---------------------------------------------------------------------------
// assertDocumentLoaderPort()
// ---------------------------------------------------------------------------

describe('assertDocumentLoaderPort()', () => {
  it('accepts a valid loader', () => {
    assert.doesNotThrow(() => assertDocumentLoaderPort({ load: () => [] }));
  });
  it('rejects null', () => {
    assert.throws(() => assertDocumentLoaderPort(null), TypeError);
  });
  it('rejects missing load', () => {
    assert.throws(() => assertDocumentLoaderPort({}), TypeError);
  });
});

// ---------------------------------------------------------------------------
// assertQueryTransformerPort()
// ---------------------------------------------------------------------------

describe('assertQueryTransformerPort()', () => {
  it('accepts a valid transformer', () => {
    assert.doesNotThrow(() => assertQueryTransformerPort({ transform: () => '' }));
  });
  it('rejects null', () => {
    assert.throws(() => assertQueryTransformerPort(null), TypeError);
  });
  it('rejects missing transform', () => {
    assert.throws(() => assertQueryTransformerPort({}), TypeError);
  });
});

// ---------------------------------------------------------------------------
// createPlainTextLoader()
// ---------------------------------------------------------------------------

describe('createPlainTextLoader()', () => {
  it('conforms to DocumentLoaderPort', () => {
    const loader = createPlainTextLoader();
    assert.doesNotThrow(() => assertDocumentLoaderPort(loader));
  });

  it('loads text as a single document', () => {
    const loader = createPlainTextLoader();
    const docs = loader.load('Hello world');
    assert.equal(docs.length, 1);
    assert.equal(docs[0].content, 'Hello world');
  });

  it('returns empty for empty input', () => {
    const loader = createPlainTextLoader();
    assert.deepEqual(loader.load(''), []);
  });

  it('assigns an id to the document', () => {
    const loader = createPlainTextLoader();
    const docs = loader.load('test');
    assert.ok(docs[0].id);
  });
});

// ---------------------------------------------------------------------------
// createMarkdownLoader()
// ---------------------------------------------------------------------------

describe('createMarkdownLoader()', () => {
  it('conforms to DocumentLoaderPort', () => {
    const loader = createMarkdownLoader();
    assert.doesNotThrow(() => assertDocumentLoaderPort(loader));
  });

  it('splits markdown by headings into separate documents', () => {
    const loader = createMarkdownLoader();
    const md = '# Title\n\nIntro.\n\n## Section A\n\nContent A.\n\n## Section B\n\nContent B.';
    const docs = loader.load(md);
    assert.ok(docs.length >= 2);
  });

  it('includes heading in document metadata', () => {
    const loader = createMarkdownLoader();
    const docs = loader.load('## My Section\n\nBody text.');
    assert.ok(docs[0].metadata);
    assert.ok(docs[0].metadata.heading || docs[0].metadata.title);
  });

  it('handles text without headings', () => {
    const loader = createMarkdownLoader();
    const docs = loader.load('Just text.');
    assert.equal(docs.length, 1);
  });

  it('returns empty for empty input', () => {
    const loader = createMarkdownLoader();
    assert.deepEqual(loader.load(''), []);
  });
});

// ---------------------------------------------------------------------------
// createHtmlLoader()
// ---------------------------------------------------------------------------

describe('createHtmlLoader()', () => {
  it('conforms to DocumentLoaderPort', () => {
    const loader = createHtmlLoader();
    assert.doesNotThrow(() => assertDocumentLoaderPort(loader));
  });

  it('strips HTML tags', () => {
    const loader = createHtmlLoader();
    const docs = loader.load('<p>Hello <b>world</b></p>');
    assert.equal(docs.length, 1);
    assert.ok(!docs[0].content.includes('<p>'));
    assert.ok(docs[0].content.includes('Hello'));
    assert.ok(docs[0].content.includes('world'));
  });

  it('handles self-closing tags', () => {
    const loader = createHtmlLoader();
    const docs = loader.load('Before<br/>After');
    assert.ok(docs[0].content.includes('Before'));
    assert.ok(docs[0].content.includes('After'));
  });

  it('decodes basic HTML entities', () => {
    const loader = createHtmlLoader();
    const docs = loader.load('&amp; &lt; &gt; &quot;');
    assert.ok(docs[0].content.includes('&'));
    assert.ok(docs[0].content.includes('<'));
  });

  it('returns empty for empty input', () => {
    const loader = createHtmlLoader();
    assert.deepEqual(loader.load(''), []);
  });

  it('collapses excessive whitespace', () => {
    const loader = createHtmlLoader();
    const docs = loader.load('<div>  lots   of   spaces  </div>');
    assert.ok(!docs[0].content.includes('   '));
  });
});

// ---------------------------------------------------------------------------
// createPassthroughTransformer()
// ---------------------------------------------------------------------------

describe('createPassthroughTransformer()', () => {
  it('conforms to QueryTransformerPort', () => {
    const t = createPassthroughTransformer();
    assert.doesNotThrow(() => assertQueryTransformerPort(t));
  });

  it('returns the query unchanged', () => {
    const t = createPassthroughTransformer();
    const result = t.transform('my query');
    assert.equal(result, 'my query');
  });
});

// ---------------------------------------------------------------------------
// createMultiQueryTransformer()
// ---------------------------------------------------------------------------

describe('createMultiQueryTransformer()', () => {
  it('conforms to QueryTransformerPort', () => {
    const t = createMultiQueryTransformer();
    assert.doesNotThrow(() => assertQueryTransformerPort(t));
  });

  it('returns multiple query variants', () => {
    const t = createMultiQueryTransformer();
    const result = t.transform('What is RAG?');
    assert.ok(Array.isArray(result));
    assert.ok(result.length >= 2, `expected >=2 variants, got ${result.length}`);
    assert.ok(result.includes('What is RAG?'), 'should include original');
  });

  it('accepts custom templates', () => {
    const t = createMultiQueryTransformer({
      templates: ['original: {query}', 'rephrased: {query}'],
    });
    const result = t.transform('test');
    assert.equal(result.length, 3);
    assert.ok(result.some((r) => r.includes('test')));
  });

  it('always includes the original query', () => {
    const t = createMultiQueryTransformer({
      templates: ['alt: {query}'],
    });
    const result = t.transform('hello');
    assert.ok(result.includes('hello'));
  });
});
