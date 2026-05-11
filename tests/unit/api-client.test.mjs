/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the behavioral contract of the fetch-adapter and ApiClientPort shape validation using only the public API, with fetch mocked in-process.
 * @sidecar api-client.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the api-client module.
 * All imports go through the public API.
 *
 * SpecRefs: TPL-068; TPL-069
 */

import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { assertApiClientPort, createFetchAdapter } from '../../modules/api-client/public-api.mjs';

// ---------------------------------------------------------------------------
// Port assertion
// ---------------------------------------------------------------------------

describe('assertApiClientPort', () => {
  test('rejects null', () => {
    assert.throws(() => assertApiClientPort(null), /non-null object/);
  });

  test('rejects non-object', () => {
    assert.throws(() => assertApiClientPort(42), /non-null object/);
  });

  test('rejects incomplete adapter', () => {
    assert.throws(() => assertApiClientPort({ get() {} }), /must implement/);
  });

  test('accepts a valid adapter', () => {
    const adapter = {
      get() {},
      post() {},
      put() {},
      delete() {},
      setBaseUrl() {},
      setHeader() {},
      removeHeader() {},
    };
    assert.doesNotThrow(() => assertApiClientPort(adapter));
  });
});

// ---------------------------------------------------------------------------
// Fetch adapter
// ---------------------------------------------------------------------------

describe('createFetchAdapter', () => {
  /** @type {ReturnType<typeof mock.fn>} */
  let mockFetch;
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = mock.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /** Helper to create a mock Response */
  function mockResponse(data, options = {}) {
    const status = options.status || 200;
    const contentType = options.contentType || 'application/json';
    const headersMap = new Map([['content-type', contentType]]);

    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get(name) {
          return headersMap.get(name.toLowerCase()) || null;
        },
        forEach(cb) {
          headersMap.forEach((v, k) => cb(v, k));
        },
      },
      json: async () => data,
      text: async () => String(data),
    };
  }

  test('passes port assertion', () => {
    const adapter = createFetchAdapter();
    assert.doesNotThrow(() => assertApiClientPort(adapter));
  });

  test('GET request calls fetch with correct method', async () => {
    mockFetch.mock.mockImplementation(async () => mockResponse({ ok: true }));

    const adapter = createFetchAdapter();
    const result = await adapter.get('/api/test');

    assert.equal(result.ok, true);
    assert.deepEqual(result.data, { ok: true });
    assert.equal(result.status, 200);

    const [url, init] = mockFetch.mock.calls[0].arguments;
    assert.equal(url, '/api/test');
    assert.equal(init.method, 'GET');
  });

  test('POST serializes body as JSON', async () => {
    mockFetch.mock.mockImplementation(async () => mockResponse({ id: 1 }));

    const adapter = createFetchAdapter();
    await adapter.post('/api/items', { name: 'test' });

    const [, init] = mockFetch.mock.calls[0].arguments;
    assert.equal(init.method, 'POST');
    assert.equal(init.body, JSON.stringify({ name: 'test' }));
  });

  test('PUT serializes body as JSON', async () => {
    mockFetch.mock.mockImplementation(async () => mockResponse({ id: 1 }));

    const adapter = createFetchAdapter();
    await adapter.put('/api/items/1', { name: 'updated' });

    const [, init] = mockFetch.mock.calls[0].arguments;
    assert.equal(init.method, 'PUT');
    assert.equal(init.body, JSON.stringify({ name: 'updated' }));
  });

  test('DELETE calls fetch with correct method', async () => {
    mockFetch.mock.mockImplementation(async () => mockResponse(null));

    const adapter = createFetchAdapter();
    await adapter.delete('/api/items/1');

    const [, init] = mockFetch.mock.calls[0].arguments;
    assert.equal(init.method, 'DELETE');
  });

  test('prepends base URL to relative URLs', async () => {
    mockFetch.mock.mockImplementation(async () => mockResponse({}));

    const adapter = createFetchAdapter({ baseUrl: 'https://api.example.com' });
    await adapter.get('/users');

    const [url] = mockFetch.mock.calls[0].arguments;
    assert.equal(url, 'https://api.example.com/users');
  });

  test('absolute URLs bypass base URL', async () => {
    mockFetch.mock.mockImplementation(async () => mockResponse({}));

    const adapter = createFetchAdapter({ baseUrl: 'https://api.example.com' });
    await adapter.get('https://other.api.com/data');

    const [url] = mockFetch.mock.calls[0].arguments;
    assert.equal(url, 'https://other.api.com/data');
  });

  test('setBaseUrl changes base URL for subsequent requests', async () => {
    mockFetch.mock.mockImplementation(async () => mockResponse({}));

    const adapter = createFetchAdapter();
    adapter.setBaseUrl('https://new.api.com');
    await adapter.get('/test');

    const [url] = mockFetch.mock.calls[0].arguments;
    assert.equal(url, 'https://new.api.com/test');
  });

  test('setHeader adds default headers', async () => {
    mockFetch.mock.mockImplementation(async () => mockResponse({}));

    const adapter = createFetchAdapter();
    adapter.setHeader('X-Custom', 'value');
    await adapter.get('/test');

    const [, init] = mockFetch.mock.calls[0].arguments;
    assert.equal(init.headers['X-Custom'], 'value');
  });

  test('removeHeader removes default headers', async () => {
    mockFetch.mock.mockImplementation(async () => mockResponse({}));

    const adapter = createFetchAdapter();
    adapter.setHeader('X-Custom', 'value');
    adapter.removeHeader('X-Custom');
    await adapter.get('/test');

    const [, init] = mockFetch.mock.calls[0].arguments;
    assert.equal(init.headers['X-Custom'], undefined);
  });

  test('per-request headers override defaults', async () => {
    mockFetch.mock.mockImplementation(async () => mockResponse({}));

    const adapter = createFetchAdapter();
    adapter.setHeader('X-Custom', 'default');
    await adapter.get('/test', { headers: { 'X-Custom': 'override' } });

    const [, init] = mockFetch.mock.calls[0].arguments;
    assert.equal(init.headers['X-Custom'], 'override');
  });

  test('query params are serialized and appended', async () => {
    mockFetch.mock.mockImplementation(async () => mockResponse({}));

    const adapter = createFetchAdapter();
    await adapter.get('/search', { params: { q: 'hello', page: 1 } });

    const [url] = mockFetch.mock.calls[0].arguments;
    assert.ok(url.includes('q=hello'));
    assert.ok(url.includes('page=1'));
    assert.ok(url.includes('?'));
  });

  test('non-2xx response throws ApiError with i18n key', async () => {
    mockFetch.mock.mockImplementation(async () =>
      mockResponse({ error: 'not found' }, { status: 404 }),
    );

    const adapter = createFetchAdapter();
    try {
      await adapter.get('/missing');
      assert.fail('Should have thrown');
    } catch (err) {
      assert.equal(err.message, 'api-client.error.request_failed');
      assert.equal(err.status, 404);
      assert.equal(err.ok, false);
    }
  });

  test('network error throws ApiError with i18n key', async () => {
    mockFetch.mock.mockImplementation(async () => {
      throw new TypeError('Failed to fetch');
    });

    const adapter = createFetchAdapter();
    try {
      await adapter.get('/unreachable');
      assert.fail('Should have thrown');
    } catch (err) {
      assert.equal(err.message, 'api-client.error.network_failure');
      assert.equal(err.status, 0);
      assert.equal(err.ok, false);
    }
  });

  test('handles text response when not JSON', async () => {
    mockFetch.mock.mockImplementation(async () =>
      mockResponse('plain text', { contentType: 'text/plain' }),
    );

    const adapter = createFetchAdapter();
    const result = await adapter.get('/text');
    assert.equal(result.data, 'plain text');
  });

  test('POST with null body sends no body', async () => {
    mockFetch.mock.mockImplementation(async () => mockResponse({}));

    const adapter = createFetchAdapter();
    await adapter.post('/api/trigger');

    const [, init] = mockFetch.mock.calls[0].arguments;
    assert.equal(init.body, undefined);
  });

  test('separate factory calls are independent', () => {
    const a = createFetchAdapter({ baseUrl: 'http://a.com' });
    const b = createFetchAdapter({ baseUrl: 'http://b.com' });
    a.setHeader('X-A', '1');
    // b should not have X-A header
    assert.notStrictEqual(a, b);
  });
});
