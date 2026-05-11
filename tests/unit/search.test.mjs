/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the search bounded module — tokenizer, document, scoring, filters, highlights.
 * @sidecar search.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSearchDocument,
  documentText,
  tokenize,
  defaultStopWords,
  highlightMatches,
  assertSearchPort,
  createMemorySearchAdapter,
} from '../../modules/search/public-api.mjs';

describe('search domain — tokenize', () => {
  test('lowercases and splits on non-word characters', () => {
    assert.deepEqual(tokenize('Hello, World!'), ['hello', 'world']);
  });

  test('drops default stop words', () => {
    assert.deepEqual(tokenize('The quick brown fox is on a log'), ['quick', 'brown', 'fox', 'log']);
  });

  test('handles Unicode letters', () => {
    assert.deepEqual(tokenize('Café Résumé'), ['café', 'résumé']);
  });

  test('returns empty array for empty or non-string input', () => {
    assert.deepEqual(tokenize(''), []);
    assert.deepEqual(tokenize(null), []);
    assert.deepEqual(tokenize(42), []);
  });

  test('honors injected stop-word set', () => {
    assert.deepEqual(tokenize('foo bar baz', { stopWords: new Set(['bar']) }), ['foo', 'baz']);
  });

  test('honors minLength option', () => {
    assert.deepEqual(tokenize('a bb ccc', { stopWords: new Set(), minLength: 2 }), ['bb', 'ccc']);
  });

  test('defaultStopWords returns a fresh copy callers can mutate', () => {
    const a = defaultStopWords();
    const b = defaultStopWords();
    a.add('custom');
    assert.equal(b.has('custom'), false);
  });
});

describe('search domain — createSearchDocument', () => {
  test('builds a canonical document and normalizes string facets to arrays', () => {
    const doc = createSearchDocument({
      id: '1',
      fields: { title: 'Hex', body: 'Ports and adapters' },
      facets: { tag: 'arch', lang: ['en', 'ru'] },
    });
    assert.equal(doc.id, '1');
    assert.deepEqual(doc.fields, { title: 'Hex', body: 'Ports and adapters' });
    assert.deepEqual(doc.facets.tag, ['arch']);
    assert.deepEqual(doc.facets.lang, ['en', 'ru']);
  });

  test('facets default to empty object when omitted', () => {
    const doc = createSearchDocument({ id: '1', fields: { title: 'Hi' } });
    assert.deepEqual(doc.facets, {});
  });

  test('documentText concatenates field values', () => {
    const doc = createSearchDocument({ id: '1', fields: { title: 'Hex', body: 'Ports' } });
    assert.equal(documentText(doc), 'Hex Ports');
  });

  test('throws on null input', () => {
    assert.throws(() => createSearchDocument(null), TypeError);
  });

  test('throws when id is missing or empty', () => {
    assert.throws(() => createSearchDocument({ id: '', fields: { t: 'x' } }), TypeError);
    assert.throws(() => createSearchDocument({ fields: { t: 'x' } }), TypeError);
  });

  test('throws when fields is missing, empty, or not an object', () => {
    assert.throws(() => createSearchDocument({ id: '1' }), TypeError);
    assert.throws(() => createSearchDocument({ id: '1', fields: {} }), TypeError);
    assert.throws(() => createSearchDocument({ id: '1', fields: [] }), TypeError);
  });

  test('throws when a field value is not a string', () => {
    assert.throws(() => createSearchDocument({ id: '1', fields: { t: 42 } }), TypeError);
  });

  test('throws when a facet value is not a string or string[]', () => {
    assert.throws(
      () => createSearchDocument({ id: '1', fields: { t: 'x' }, facets: { tag: 42 } }),
      TypeError,
    );
    assert.throws(
      () => createSearchDocument({ id: '1', fields: { t: 'x' }, facets: { tag: [1, 2] } }),
      TypeError,
    );
  });
});

describe('search domain — highlightMatches', () => {
  test('wraps matched tokens with <mark>, case-insensitive, preserves original casing', () => {
    assert.equal(
      highlightMatches('Hexagonal architecture is cool', ['hexagonal', 'cool']),
      '<mark>Hexagonal</mark> architecture is <mark>cool</mark>',
    );
  });

  test('does not highlight partial matches inside longer words', () => {
    assert.equal(highlightMatches('researcher', ['search']), 'researcher');
  });

  test('returns the text unchanged when no tokens match', () => {
    assert.equal(highlightMatches('foo bar', ['baz']), 'foo bar');
  });

  test('returns empty string on empty text', () => {
    assert.equal(highlightMatches('', ['x']), '');
  });
});

describe('search port — assertSearchPort', () => {
  test('accepts a fully-featured adapter', () => {
    assert.doesNotThrow(() => assertSearchPort(createMemorySearchAdapter()));
  });

  test('rejects non-objects', () => {
    assert.throws(() => assertSearchPort(null), TypeError);
    assert.throws(() => assertSearchPort(42), TypeError);
  });

  test('rejects adapters missing required methods', () => {
    assert.throws(
      () =>
        assertSearchPort({
          index: () => {},
          indexBatch: () => {},
          search: () => {},
          clear: () => {},
        }),
      TypeError,
    );
  });
});

describe('search adapter — memory (indexing)', () => {
  test('index + search finds the indexed document', async () => {
    const index = createMemorySearchAdapter();
    await index.index({ id: '1', fields: { title: 'Hexagonal architecture' } });
    const result = await index.search('hexagonal');
    assert.equal(result.total, 1);
    assert.equal(result.hits[0].id, '1');
  });

  test('indexBatch accepts an array and returns normalized documents', async () => {
    const index = createMemorySearchAdapter();
    const docs = await index.indexBatch([
      { id: '1', fields: { title: 'One' } },
      { id: '2', fields: { title: 'Two' } },
    ]);
    assert.equal(docs.length, 2);
    assert.equal(docs[0].id, '1');
  });

  test('indexBatch throws on non-array input', async () => {
    const index = createMemorySearchAdapter();
    await assert.rejects(() => index.indexBatch('not an array'), TypeError);
  });

  test('re-indexing the same id replaces the old postings', async () => {
    const index = createMemorySearchAdapter();
    await index.index({ id: '1', fields: { title: 'apple' } });
    await index.index({ id: '1', fields: { title: 'banana' } });
    assert.equal((await index.search('apple')).total, 0);
    assert.equal((await index.search('banana')).total, 1);
  });

  test('remove drops the document from the index', async () => {
    const index = createMemorySearchAdapter();
    await index.index({ id: '1', fields: { title: 'apple' } });
    assert.equal(await index.remove('1'), true);
    assert.equal(await index.remove('1'), false);
    assert.equal((await index.search('apple')).total, 0);
  });

  test('clear empties the entire index', async () => {
    const index = createMemorySearchAdapter();
    await index.index({ id: '1', fields: { title: 'apple' } });
    index.clear();
    assert.equal((await index.search('apple')).total, 0);
  });
});

describe('search adapter — memory (ranking)', () => {
  test('rarer terms score higher — IDF weighting', async () => {
    const index = createMemorySearchAdapter();
    await index.indexBatch([
      { id: '1', fields: { body: 'hexagonal architecture' } },
      { id: '2', fields: { body: 'hexagonal tiles' } },
      { id: '3', fields: { body: 'architecture matters' } },
    ]);
    // "architecture" appears in 2 docs, "tiles" in 1 → doc 2's "tiles" match is rarer.
    const result = await index.search('hexagonal tiles');
    assert.equal(result.hits[0].id, '2');
  });

  test('returns total and took timings', async () => {
    let now = 0;
    const index = createMemorySearchAdapter({ now: () => (now += 5) });
    await index.index({ id: '1', fields: { title: 'apple' } });
    const result = await index.search('apple');
    assert.equal(result.total, 1);
    assert.equal(typeof result.took, 'number');
  });

  test('honors limit and offset', async () => {
    const index = createMemorySearchAdapter();
    for (let i = 1; i <= 5; i += 1) {
      await index.index({ id: String(i), fields: { body: 'apple' } });
    }
    const page1 = await index.search('apple', { limit: 2, offset: 0 });
    const page2 = await index.search('apple', { limit: 2, offset: 2 });
    assert.equal(page1.hits.length, 2);
    assert.equal(page2.hits.length, 2);
    assert.equal(page1.total, 5);
    assert.notEqual(page1.hits[0].id, page2.hits[0].id);
  });

  test('rejects invalid query, limit, offset, filters', async () => {
    const index = createMemorySearchAdapter();
    await index.index({ id: '1', fields: { body: 'apple' } });
    await assert.rejects(() => index.search(''), TypeError);
    await assert.rejects(() => index.search('apple', { limit: 0 }), TypeError);
    await assert.rejects(() => index.search('apple', { limit: 1.5 }), TypeError);
    await assert.rejects(() => index.search('apple', { offset: -1 }), TypeError);
    await assert.rejects(() => index.search('apple', { filters: 'nope' }), TypeError);
    await assert.rejects(() => index.search('apple', { filters: { tag: 42 } }), TypeError);
  });
});

describe('search adapter — memory (filters and highlights)', () => {
  test('facet filter narrows the result set', async () => {
    const index = createMemorySearchAdapter();
    await index.indexBatch([
      { id: '1', fields: { body: 'apple pie' }, facets: { tag: 'dessert' } },
      { id: '2', fields: { body: 'apple sauce' }, facets: { tag: 'savory' } },
      { id: '3', fields: { body: 'apple crisp' }, facets: { tag: ['dessert', 'seasonal'] } },
    ]);
    const result = await index.search('apple', { filters: { tag: 'dessert' } });
    assert.equal(result.total, 2);
    const ids = result.hits.map((h) => h.id).sort();
    assert.deepEqual(ids, ['1', '3']);
  });

  test('multiple filter values OR inside one facet, AND across facets', async () => {
    const index = createMemorySearchAdapter();
    await index.indexBatch([
      { id: '1', fields: { body: 'x' }, facets: { tag: 'a', lang: 'en' } },
      { id: '2', fields: { body: 'x' }, facets: { tag: 'b', lang: 'en' } },
      { id: '3', fields: { body: 'x' }, facets: { tag: 'a', lang: 'ru' } },
    ]);
    const result = await index.search('x', { filters: { tag: ['a', 'b'], lang: 'en' } });
    assert.equal(result.total, 2);
  });

  test('hits include highlights per field by default', async () => {
    const index = createMemorySearchAdapter();
    await index.index({
      id: '1',
      fields: { title: 'Hexagonal architecture', body: 'Ports and adapters' },
    });
    const result = await index.search('hexagonal adapters');
    assert.equal(result.hits[0].highlights.title, '<mark>Hexagonal</mark> architecture');
    assert.equal(result.hits[0].highlights.body, 'Ports and <mark>adapters</mark>');
  });

  test('highlight:false disables highlighting', async () => {
    const index = createMemorySearchAdapter();
    await index.index({ id: '1', fields: { title: 'Hexagonal' } });
    const result = await index.search('hexagonal', { highlight: false });
    assert.deepEqual(result.hits[0].highlights, {});
  });
});
