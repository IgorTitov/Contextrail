/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the realtime server-side transport (wsServerTransport) — TransportPort contract, message reception, send semantics, and connection-close handling.
 * @sidecar realtime-server.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the realtime module — server-side wsServerTransport.
 * Domain-layer tests live in realtime.test.mjs; browser transport
 * adapters and the transport manager live in
 * realtime-transports.test.mjs.
 *
 * SpecRefs: TPL-218
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertTransportPort,
  createWsServerTransport,
} from '../../modules/realtime/public-api.mjs';

// ---------------------------------------------------------------------------
// Helper: mock WebSocket server connection
// ---------------------------------------------------------------------------

/**
 * Create a mock WebSocket server connection.
 * Simulates the `ws` library's WebSocket connection interface.
 */
function createMockWsConnection(options = {}) {
  const { readyState = 1 } = options;
  const handlers = {};
  const calls = [];
  const sendFn = (data) => calls.push(data);
  sendFn._calls = calls;
  return {
    readyState,
    on(event, handler) {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    },
    send: sendFn,
    close() {
      setTimeout(() => {
        if (handlers.close) handlers.close.forEach((h) => h());
      }, 1);
    },
    _emit(event, ...args) {
      if (handlers[event]) handlers[event].forEach((h) => h(...args));
    },
  };
}

// ---------------------------------------------------------------------------
// wsServerTransport
// ---------------------------------------------------------------------------

test('wsServerTransport — satisfies the TransportPort contract', () => {
  const transport = createWsServerTransport();
  assert.doesNotThrow(() => assertTransportPort(transport));
});

test('wsServerTransport — starts in disconnected state', () => {
  const transport = createWsServerTransport();
  assert.equal(transport.getState(), 'disconnected');
});

test('wsServerTransport — isSupported returns true in Node.js', () => {
  const transport = createWsServerTransport();
  assert.equal(transport.isSupported(), true);
});

test('wsServerTransport — open connects with readyState=1 connection', async () => {
  const transport = createWsServerTransport();
  const conn = createMockWsConnection({ readyState: 1 });
  await transport.open('ws://ignored', { connection: conn });
  assert.equal(transport.getState(), 'connected');
});

test('wsServerTransport — open rejects without connection option', async () => {
  const transport = createWsServerTransport();
  await assert.rejects(() => transport.open('ws://ignored'), {
    message: 'ws-server-transport requires options.connection',
  });
  assert.equal(transport.getState(), 'failed');
});

test('wsServerTransport — receives messages from connection', async () => {
  const transport = createWsServerTransport();
  const conn = createMockWsConnection({ readyState: 1 });
  const messages = [];
  transport.onMessage((data) => messages.push(data));
  await transport.open('ws://ignored', { connection: conn });
  conn._emit('message', 'hello');
  conn._emit('message', 'world');
  assert.deepEqual(messages, ['hello', 'world']);
});

test('wsServerTransport — send writes to connection', async () => {
  const transport = createWsServerTransport();
  const conn = createMockWsConnection({ readyState: 1 });
  await transport.open('ws://ignored', { connection: conn });
  transport.send('test-data');
  assert.equal(conn.send._calls[0], 'test-data');
});

test('wsServerTransport — send stringifies non-string data', async () => {
  const transport = createWsServerTransport();
  const conn = createMockWsConnection({ readyState: 1 });
  await transport.open('ws://ignored', { connection: conn });
  transport.send({ key: 'value' });
  assert.equal(conn.send._calls[0], JSON.stringify({ key: 'value' }));
});

test('wsServerTransport — send throws when not connected', () => {
  const transport = createWsServerTransport();
  assert.throws(() => transport.send('data'), { message: 'Cannot send data while not connected.' });
});

test('wsServerTransport — close transitions to disconnected', async () => {
  const transport = createWsServerTransport();
  const conn = createMockWsConnection({ readyState: 1 });
  await transport.open('ws://ignored', { connection: conn });
  assert.equal(transport.getState(), 'connected');
  await transport.close();
  assert.equal(transport.getState(), 'disconnected');
});

test('wsServerTransport — close is safe when already disconnected', async () => {
  const transport = createWsServerTransport();
  await transport.close();
  assert.equal(transport.getState(), 'disconnected');
});

test('wsServerTransport — onStateChange reports state transitions', async () => {
  const transport = createWsServerTransport();
  const states = [];
  transport.onStateChange((s) => states.push(s));
  const conn = createMockWsConnection({ readyState: 1 });
  await transport.open('ws://ignored', { connection: conn });
  assert.ok(states.includes('connecting'));
  assert.ok(states.includes('connected'));
});

test('wsServerTransport — connection close event sets disconnected', async () => {
  const transport = createWsServerTransport();
  const conn = createMockWsConnection({ readyState: 1 });
  await transport.open('ws://ignored', { connection: conn });
  assert.equal(transport.getState(), 'connected');
  conn._emit('close');
  assert.equal(transport.getState(), 'disconnected');
});
