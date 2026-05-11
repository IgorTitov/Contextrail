/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of api-starter-test in this repository.
 * @sidecar api-starter.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for api-starter.feature.
 * Proves user-visible HTTP behavior of the api-starter app shell.
 */

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startServer } from '../../apps/api-starter/app.mjs';

const feature = readFileSync(new URL('./features/api-starter.feature', import.meta.url), 'utf8');

describe('Feature: API starter server', () => {
  /** @type {import('node:http').Server | null} */
  let server = null;
  let baseUrl = '';

  /**
   * Start a test server and wait for it to be ready.
   */
  async function boot() {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  }

  afterEach((t, done) => {
    if (server) {
      server.close(() => {
        server = null;
        done();
      });
    } else {
      done();
    }
  });

  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: API starter server'));
    assert.ok(feature.includes('Scenario: Health endpoint returns server status'));
    assert.ok(feature.includes('Scenario: Greeting endpoint says hello'));
    assert.ok(feature.includes('Scenario: Greeting uses cache on repeated calls'));
    assert.ok(feature.includes('Scenario: Unknown routes return 404'));
    assert.ok(feature.includes('Scenario: CORS headers are present'));
    assert.ok(feature.includes('Scenario: OPTIONS preflight returns 204'));
  });

  test('Scenario: Health endpoint returns server status', async () => {
    await boot();

    // When the client sends GET /health
    const res = await fetch(`${baseUrl}/health`);

    // Then the response status is 200
    assert.equal(res.status, 200);

    const body = await res.json();
    // And the response body contains status "ok"
    assert.equal(body.status, 'ok');
    // And the response body contains the current mode
    assert.equal(body.mode, 'test');
  });

  test('Scenario: Greeting endpoint says hello', async () => {
    await boot();

    // When the client sends GET /api/greet?name=Alice
    const res = await fetch(`${baseUrl}/api/greet?name=Alice`);

    // Then the response status is 200
    assert.equal(res.status, 200);

    const body = await res.json();
    // And the response body message is "Hello, Alice!"
    assert.equal(body.message, 'Hello, Alice!');
    // And the response body cached is false
    assert.equal(body.cached, false);
  });

  test('Scenario: Greeting uses cache on repeated calls', async () => {
    await boot();

    // When the client sends GET /api/greet?name=Bob
    await fetch(`${baseUrl}/api/greet?name=Bob`);

    // And the client sends GET /api/greet?name=Bob again
    const res2 = await fetch(`${baseUrl}/api/greet?name=Bob`);
    const body2 = await res2.json();

    // Then the second response body cached is true
    assert.equal(body2.cached, true);
  });

  test('Scenario: Unknown routes return 404', async () => {
    await boot();

    // When the client sends GET /nonexistent
    const res = await fetch(`${baseUrl}/nonexistent`);

    // Then the response status is 404
    assert.equal(res.status, 404);

    const body = await res.json();
    // And the response body error is "Not found"
    assert.equal(body.error, 'Not found');
  });

  test('Scenario: CORS headers are present', async () => {
    await boot();

    // When the client sends GET /health
    const res = await fetch(`${baseUrl}/health`);

    // Then the response includes Access-Control-Allow-Origin header
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
  });

  test('Scenario: OPTIONS preflight returns 204', async () => {
    await boot();

    // When the client sends OPTIONS /api/greet
    const res = await fetch(`${baseUrl}/api/greet`, { method: 'OPTIONS' });

    // Then the response status is 204
    assert.equal(res.status, 204);

    // And the response includes CORS headers
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    assert.ok(res.headers.get('access-control-allow-methods'));
  });
});
