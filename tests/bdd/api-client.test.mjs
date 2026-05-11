/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of api-client-test in this repository.
 * @sidecar api-client.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for api-client.feature.
 * Proves user-visible behavior through the api-client module public API.
 */

import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertApiClientPort, createFetchAdapter } from '../../modules/api-client/public-api.mjs';

const feature = readFileSync(new URL('./features/api-client.feature', import.meta.url), 'utf8');

describe('Feature: API client HTTP requests', () => {
  let adapter;
  let mockFetch;
  let originalFetch;

  function mockResponse(data, opts = {}) {
    const status = opts.status || 200;
    const headersMap = new Map([['content-type', 'application/json']]);
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: (n) => headersMap.get(n.toLowerCase()) || null,
        forEach: (cb) => headersMap.forEach((v, k) => cb(v, k)),
      },
      json: async () => data,
      text: async () => JSON.stringify(data),
    };
  }

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = mock.fn(async () => mockResponse({ ok: true }));
    globalThis.fetch = mockFetch;
    adapter = createFetchAdapter();
    assertApiClientPort(adapter);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: API client HTTP requests'));
    assert.ok(feature.includes('Scenario: GET request returns parsed JSON'));
    assert.ok(feature.includes('Scenario: POST request serializes body as JSON'));
    assert.ok(feature.includes('Scenario: Base URL is prepended to relative paths'));
    assert.ok(feature.includes('Scenario: Custom headers are included in requests'));
    assert.ok(feature.includes('Scenario: Non-2xx response throws an error'));
  });

  test('Scenario: GET request returns parsed JSON', async () => {
    const result = await adapter.get('/users/1');
    assert.equal(result.status, 200);
    const [url, init] = mockFetch.mock.calls[0].arguments;
    assert.equal(init.method, 'GET');
  });

  test('Scenario: POST request serializes body as JSON', async () => {
    await adapter.post('/users', { name: 'Bob' });
    const [, init] = mockFetch.mock.calls[0].arguments;
    assert.equal(init.method, 'POST');
    assert.equal(init.body, JSON.stringify({ name: 'Bob' }));
  });

  test('Scenario: Base URL is prepended to relative paths', async () => {
    adapter = createFetchAdapter({ baseUrl: 'https://api.example.com' });
    await adapter.get('/users');
    const [url] = mockFetch.mock.calls[0].arguments;
    assert.ok(url.startsWith('https://api.example.com'));
  });

  test('Scenario: Custom headers are included in requests', async () => {
    adapter.setHeader('Authorization', 'Bearer token');
    await adapter.get('/data');
    const [, init] = mockFetch.mock.calls[0].arguments;
    assert.ok(init.headers['Authorization'] || init.headers['authorization']);
  });

  test('Scenario: Non-2xx response throws an error', async () => {
    globalThis.fetch = async () => mockResponse({ error: 'Not found' }, { status: 404 });
    const failAdapter = createFetchAdapter();
    await assert.rejects(() => failAdapter.get('/missing'));
  });
});
