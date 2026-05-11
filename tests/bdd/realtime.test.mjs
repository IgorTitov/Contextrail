/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of realtime-test in this repository.
 * @sidecar realtime.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for realtime.feature.
 * Proves user-visible realtime transport behavior through the realtime module public API.
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertRealtimePort, createTransportManager } from '../../modules/realtime/public-api.mjs';

const feature = readFileSync(new URL('./features/realtime.feature', import.meta.url), 'utf8');

/**
 * Create a mock transport that satisfies TransportPort for testing.
 */
function createMockTransport() {
  let state = 'disconnected';
  const messageListeners = [];
  const stateListeners = [];
  const sent = [];

  function setState(s) {
    state = s;
    for (const cb of stateListeners) cb(s);
  }

  return {
    _simulateMessage(data) {
      for (const cb of messageListeners) cb(data);
    },
    _sent: sent,

    isSupported() {
      return true;
    },
    getState() {
      return state;
    },

    async open() {
      setState('connecting');
      setState('connected');
    },
    async close() {
      setState('disconnected');
    },
    send(data) {
      if (state !== 'connected') throw new Error('Not connected');
      sent.push(data);
    },
    onMessage(cb) {
      messageListeners.push(cb);
    },
    onStateChange(cb) {
      stateListeners.push(cb);
    },
  };
}

describe('Feature: Realtime transport abstraction', () => {
  /** @type {ReturnType<typeof createTransportManager>} */
  let manager;
  /** @type {ReturnType<typeof createMockTransport>} */
  let transport;

  beforeEach(() => {
    transport = createMockTransport();
    manager = createTransportManager([transport], { autoReconnect: false });
    assertRealtimePort(manager);
  });

  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Realtime transport abstraction'));
    assert.ok(feature.includes('Scenario: Connection state transitions'));
    assert.ok(feature.includes('Scenario: Subscribe and receive a message'));
    assert.ok(feature.includes('Scenario: Unsubscribe stops delivery'));
    assert.ok(feature.includes('Scenario: Send a message on a channel'));
    assert.ok(feature.includes('Scenario: Disconnect cleans up'));
  });

  test('Scenario: Connection state transitions', async () => {
    // When the transport connects
    await manager.connect('ws://localhost');

    // Then the connection state is "connected"
    assert.equal(manager.getState(), 'connected');

    await manager.disconnect();
  });

  test('Scenario: Subscribe and receive a message', async () => {
    // Given a connected realtime transport
    await manager.connect('ws://localhost');

    // When the user subscribes to channel "chat"
    const received = [];
    manager.subscribe('chat', (d) => received.push(d));

    // And a message arrives on channel "chat" with data "hello"
    transport._simulateMessage(JSON.stringify({ channel: 'chat', data: 'hello' }));

    // Then the subscriber receives data "hello"
    assert.equal(received.length, 1);
    assert.equal(received[0], 'hello');

    await manager.disconnect();
  });

  test('Scenario: Unsubscribe stops delivery', async () => {
    // Given a connected realtime transport
    await manager.connect('ws://localhost');

    // And the user is subscribed to channel "updates"
    const received = [];
    const cb = (d) => received.push(d);
    manager.subscribe('updates', cb);

    // When the user unsubscribes from channel "updates"
    manager.unsubscribe('updates', cb);

    // And a message arrives on channel "updates" with data "missed"
    transport._simulateMessage(JSON.stringify({ channel: 'updates', data: 'missed' }));

    // Then the subscriber receives no messages
    assert.equal(received.length, 0);

    await manager.disconnect();
  });

  test('Scenario: Send a message on a channel', async () => {
    // Given a connected realtime transport
    await manager.connect('ws://localhost');

    // When the user sends data "ping" on channel "heartbeat"
    manager.send('heartbeat', 'ping');

    // Then the transport records the outgoing message
    assert.ok(transport._sent.length > 0);

    await manager.disconnect();
  });

  test('Scenario: Disconnect cleans up', async () => {
    // Given a connected realtime transport
    await manager.connect('ws://localhost');
    assert.equal(manager.getState(), 'connected');

    // When the transport disconnects
    await manager.disconnect();

    // Then the connection state is "disconnected"
    assert.equal(manager.getState(), 'disconnected');
  });
});
