/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the openapi bounded module — builder shape, validation, and adapter behavior.
 * @sidecar openapi.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOpenApiDocument,
  assertOpenApiDocumentPort,
  createStaticOpenApiAdapter,
  createRouteRegistryOpenApiAdapter,
} from '../../modules/openapi/public-api.mjs';

const SAMPLE_INPUT = {
  info: { title: 'Test API', version: '1.0.0', description: 'Sample' },
  servers: [{ url: 'http://localhost:3000', description: 'Local' }],
  routes: [
    {
      method: 'GET',
      path: '/health',
      summary: 'Liveness probe',
      tags: ['system'],
      responses: { 200: { description: 'OK' } },
    },
    {
      method: 'POST',
      path: '/api/users',
      summary: 'Create user',
    },
  ],
};

describe('openapi domain — buildOpenApiDocument()', () => {
  test('produces a valid OpenAPI 3.0.3 root shape', () => {
    const doc = buildOpenApiDocument(SAMPLE_INPUT);
    assert.equal(doc.openapi, '3.0.3');
    assert.equal(doc.info.title, 'Test API');
    assert.equal(doc.info.version, '1.0.0');
    assert.equal(doc.info.description, 'Sample');
  });

  test('emits servers when provided', () => {
    const doc = buildOpenApiDocument(SAMPLE_INPUT);
    assert.deepEqual(doc.servers, [{ url: 'http://localhost:3000', description: 'Local' }]);
  });

  test('omits servers when not provided', () => {
    const doc = buildOpenApiDocument({
      info: { title: 'X', version: '0.0.1' },
      routes: [],
    });
    assert.equal(doc.servers, undefined);
  });

  test('emits one paths entry per unique path with lowercased method keys', () => {
    const doc = buildOpenApiDocument(SAMPLE_INPUT);
    assert.ok(doc.paths['/health']);
    assert.ok(doc.paths['/health'].get);
    assert.ok(doc.paths['/api/users']);
    assert.ok(doc.paths['/api/users'].post);
  });

  test('groups multiple methods under the same path', () => {
    const doc = buildOpenApiDocument({
      info: { title: 'X', version: '0.0.1' },
      routes: [
        { method: 'GET', path: '/items' },
        { method: 'POST', path: '/items' },
      ],
    });
    assert.ok(doc.paths['/items'].get);
    assert.ok(doc.paths['/items'].post);
  });

  test('preserves provided summary, description, tags, parameters, and responses', () => {
    const doc = buildOpenApiDocument({
      info: { title: 'X', version: '0.0.1' },
      routes: [
        {
          method: 'GET',
          path: '/items/{id}',
          summary: 'Get item',
          description: 'Returns one item by id',
          tags: ['items'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Item found' },
            404: { description: 'Not found' },
          },
        },
      ],
    });
    const op = doc.paths['/items/{id}'].get;
    assert.equal(op.summary, 'Get item');
    assert.equal(op.description, 'Returns one item by id');
    assert.deepEqual(op.tags, ['items']);
    assert.equal(op.parameters[0].name, 'id');
    assert.equal(op.responses[404].description, 'Not found');
  });

  test('falls back to a default summary and 200 response when omitted', () => {
    const doc = buildOpenApiDocument({
      info: { title: 'X', version: '0.0.1' },
      routes: [{ method: 'get', path: '/ping' }],
    });
    const op = doc.paths['/ping'].get;
    assert.equal(op.summary, 'GET /ping');
    assert.ok(op.responses['200']);
  });

  test('the produced document is JSON-serializable', () => {
    const doc = buildOpenApiDocument(SAMPLE_INPUT);
    assert.doesNotThrow(() => JSON.stringify(doc));
  });

  test('throws TypeError when info is missing or incomplete', () => {
    assert.throws(() => buildOpenApiDocument({ routes: [] }), TypeError);
    assert.throws(() => buildOpenApiDocument({ info: { title: 'X' }, routes: [] }), TypeError);
  });

  test('throws TypeError when routes is not an array', () => {
    assert.throws(
      () => buildOpenApiDocument({ info: { title: 'X', version: '1' }, routes: null }),
      TypeError,
    );
  });

  test('throws TypeError when route path does not start with /', () => {
    assert.throws(
      () =>
        buildOpenApiDocument({
          info: { title: 'X', version: '1' },
          routes: [{ method: 'GET', path: 'health' }],
        }),
      TypeError,
    );
  });

  test('throws TypeError when route method is empty', () => {
    assert.throws(
      () =>
        buildOpenApiDocument({
          info: { title: 'X', version: '1' },
          routes: [{ method: '', path: '/health' }],
        }),
      TypeError,
    );
  });
});

describe('openapi port — assertOpenApiDocumentPort()', () => {
  test('accepts an adapter with getDocument()', () => {
    assert.doesNotThrow(() => assertOpenApiDocumentPort({ getDocument: () => ({}) }));
  });

  test('throws TypeError for null adapter', () => {
    assert.throws(() => assertOpenApiDocumentPort(null), TypeError);
  });

  test('throws TypeError for adapter missing getDocument', () => {
    assert.throws(() => assertOpenApiDocumentPort({}), TypeError);
    assert.throws(() => assertOpenApiDocumentPort({ getDocument: 'nope' }), TypeError);
  });
});

describe('openapi adapter — createStaticOpenApiAdapter()', () => {
  test('returns the same document on every call', () => {
    const doc = { openapi: '3.0.3', info: { title: 'X', version: '1' }, paths: {} };
    const adapter = createStaticOpenApiAdapter(doc);
    assert.equal(adapter.getDocument(), doc);
    assert.equal(adapter.getDocument(), doc);
  });

  test('satisfies the port contract', () => {
    const adapter = createStaticOpenApiAdapter({ openapi: '3.0.3', info: {}, paths: {} });
    assert.doesNotThrow(() => assertOpenApiDocumentPort(adapter));
  });

  test('throws when called without a document', () => {
    assert.throws(() => createStaticOpenApiAdapter(null), TypeError);
  });
});

describe('openapi adapter — createRouteRegistryOpenApiAdapter()', () => {
  test('builds a valid OpenAPI document on first getDocument() call', () => {
    const adapter = createRouteRegistryOpenApiAdapter(SAMPLE_INPUT);
    const doc = adapter.getDocument();
    assert.equal(doc.openapi, '3.0.3');
    assert.equal(doc.info.title, 'Test API');
    assert.ok(doc.paths['/health'].get);
  });

  test('caches the document — repeated calls return the same instance', () => {
    const adapter = createRouteRegistryOpenApiAdapter(SAMPLE_INPUT);
    const a = adapter.getDocument();
    const b = adapter.getDocument();
    assert.equal(a, b);
  });

  test('satisfies the port contract', () => {
    const adapter = createRouteRegistryOpenApiAdapter(SAMPLE_INPUT);
    assert.doesNotThrow(() => assertOpenApiDocumentPort(adapter));
  });
});
