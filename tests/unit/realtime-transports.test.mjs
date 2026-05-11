/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the realtime transport adapters (WebSocket, SSE, long-polling, WebRTC) and the transport manager — adapter shape, behavior with mocked browser globals, multiplexing, fallback, and reconnection.
 * @sidecar realtime-transports.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the realtime module — browser transport adapters and
 * the transport manager. Domain-layer tests live in realtime.test.mjs;
 * the server-side wsServerTransport lives in realtime-server.test.mjs.
 *
 * SpecRefs: TPL-218
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertRealtimePort,
  assertTransportPort,
  createTransportManager,
  createWebSocketTransport,
  createSseTransport,
  createLongPollingTransport,
  createWebRtcTransport,
} from '../../modules/realtime/public-api.mjs';

// ---------------------------------------------------------------------------
// Helpers: minimal transport mock
// ---------------------------------------------------------------------------

/**
 * Create a mock transport that satisfies TransportPort.
 */
function createMockTransport(overrides = {}) {
  const { supported = true, failOnOpen = false } = overrides;
  let state = 'disconnected';
  const messageListeners = [];
  const stateListeners = [];

  function setState(s) {
    state = s;
    for (const cb of stateListeners) cb(s);
  }

  return {
    _messageListeners: messageListeners,
    _stateListeners: stateListeners,
    _simulateMessage(data) {
      for (const cb of messageListeners) cb(data);
    },
    _simulateStateChange(s) {
      setState(s);
    },

    isSupported() { return supported; },
    getState() { return state; },

    async open() {
      setState('connecting');
      if (failOnOpen) {
        setState('failed');
        throw new Error('Mock open failed');
      }
      setState('connected');
    },

    async close() { setState('disconnected'); },
    send() {
      if (state !== 'connected') throw new Error('Not connected');
    },
    onMessage(cb) { messageListeners.push(cb); },
    onStateChange(cb) { stateListeners.push(cb); },
  };
}

// ===========================================================================
// Transport Adapters — structural checks
// (Browser globals are not available in Node; we test shape and isSupported)
// ===========================================================================

test('WebSocket transport has correct TransportPort shape', () => {
  const transport = createWebSocketTransport();
  assertTransportPort(transport);
});

test('WebSocket transport isSupported returns false in Node (no global WebSocket)', () => {
  const transport = createWebSocketTransport();
  assert.equal(transport.isSupported(), typeof globalThis.WebSocket !== 'undefined');
});

test('WebSocket transport starts in disconnected state', () => {
  const transport = createWebSocketTransport();
  assert.equal(transport.getState(), 'disconnected');
});

test('SSE transport has correct TransportPort shape', () => {
  const transport = createSseTransport();
  assertTransportPort(transport);
});

test('SSE transport isSupported returns false in Node (no global EventSource)', () => {
  const transport = createSseTransport();
  assert.equal(transport.isSupported(), typeof globalThis.EventSource !== 'undefined');
});

test('long-polling transport has correct TransportPort shape', () => {
  const transport = createLongPollingTransport();
  assertTransportPort(transport);
});

test('long-polling transport isSupported returns true (fetch is available)', () => {
  const transport = createLongPollingTransport();
  assert.equal(transport.isSupported(), typeof globalThis.fetch !== 'undefined');
});

test('WebRTC transport has correct TransportPort shape', () => {
  const transport = createWebRtcTransport(async () => {});
  assertTransportPort(transport);
});

test('WebRTC transport isSupported returns false in Node (no global RTCPeerConnection)', () => {
  const transport = createWebRtcTransport(async () => {});
  assert.equal(transport.isSupported(), typeof globalThis.RTCPeerConnection !== 'undefined');
});

// ===========================================================================
// Transport Adapters — WebSocket with mock global
// ===========================================================================

test('WebSocket transport: open connects and fires state changes', async () => {
  const states = [];
  const origWs = globalThis.WebSocket;
  globalThis.WebSocket = class MockWebSocket {
    constructor() {
      this.onopen = null;
      this.onmessage = null;
      this.onclose = null;
      this.onerror = null;
      setTimeout(() => {
        if (this.onopen) this.onopen();
      }, 5);
    }
    send() {}
    close() {
      if (this.onclose) this.onclose();
    }
  };
  try {
    const transport = createWebSocketTransport();
    transport.onStateChange((s) => states.push(s));
    await transport.open('ws://localhost');
    assert.equal(transport.getState(), 'connected');
    assert.ok(states.includes('connecting'));
    assert.ok(states.includes('connected'));
    await transport.close();
    assert.equal(transport.getState(), 'disconnected');
  } finally {
    if (origWs !== undefined) {
      globalThis.WebSocket = origWs;
    } else {
      delete globalThis.WebSocket;
    }
  }
});

test('WebSocket transport: receives messages', async () => {
  const origWs = globalThis.WebSocket;
  let instance;
  globalThis.WebSocket = class MockWebSocket {
    constructor() {
      instance = this;
      this.onopen = null;
      this.onmessage = null;
      this.onclose = null;
      this.onerror = null;
      setTimeout(() => {
        if (this.onopen) this.onopen();
      }, 5);
    }
    send() {}
    close() {
      if (this.onclose) this.onclose();
    }
  };
  try {
    const transport = createWebSocketTransport();
    const messages = [];
    transport.onMessage((data) => messages.push(data));
    await transport.open('ws://localhost');
    instance.onmessage({ data: 'hello' });
    instance.onmessage({ data: '{"channel":"test","data":42}' });
    assert.equal(messages.length, 2);
    assert.equal(messages[0], 'hello');
    await transport.close();
  } finally {
    if (origWs !== undefined) {
      globalThis.WebSocket = origWs;
    } else {
      delete globalThis.WebSocket;
    }
  }
});

test('WebSocket transport: send throws when not connected', () => {
  const transport = createWebSocketTransport();
  assert.throws(() => transport.send('data'), /not connected/i);
});

// ===========================================================================
// Transport Adapters — SSE with mock global
// ===========================================================================

test('SSE transport: open connects with EventSource mock', async () => {
  const origEs = globalThis.EventSource;
  globalThis.EventSource = class MockEventSource {
    constructor() {
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      setTimeout(() => {
        if (this.onopen) this.onopen();
      }, 5);
    }
    close() {}
  };
  try {
    const transport = createSseTransport({ sendEndpoint: '/send' });
    const states = [];
    transport.onStateChange((s) => states.push(s));
    await transport.open('http://localhost/sse');
    assert.equal(transport.getState(), 'connected');
    assert.ok(states.includes('connecting'));
    assert.ok(states.includes('connected'));
    await transport.close();
    assert.equal(transport.getState(), 'disconnected');
  } finally {
    if (origEs !== undefined) {
      globalThis.EventSource = origEs;
    } else {
      delete globalThis.EventSource;
    }
  }
});

test('SSE transport: receives messages', async () => {
  const origEs = globalThis.EventSource;
  let esInstance;
  globalThis.EventSource = class MockEventSource {
    constructor() {
      esInstance = this;
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      setTimeout(() => {
        if (this.onopen) this.onopen();
      }, 5);
    }
    close() {}
  };
  try {
    const transport = createSseTransport({ sendEndpoint: '/send' });
    const messages = [];
    transport.onMessage((data) => messages.push(data));
    await transport.open('http://localhost/sse');
    esInstance.onmessage({ data: 'event-data' });
    assert.equal(messages.length, 1);
    assert.equal(messages[0], 'event-data');
    await transport.close();
  } finally {
    if (origEs !== undefined) {
      globalThis.EventSource = origEs;
    } else {
      delete globalThis.EventSource;
    }
  }
});

// ===========================================================================
// Transport Adapters — Long-polling with mock fetch
// ===========================================================================

test('long-polling transport: open connects and starts polling', async () => {
  const origFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount++;
    return { ok: true, json: async () => ({ data: fetchCount }) };
  };
  try {
    const transport = createLongPollingTransport({ timeout: 500 });
    const states = [];
    transport.onStateChange((s) => states.push(s));
    await transport.open('http://localhost/poll');
    assert.equal(transport.getState(), 'connected');
    assert.ok(states.includes('connecting'));
    assert.ok(states.includes('connected'));
    await new Promise((r) => setTimeout(r, 30));
    await transport.close();
    assert.equal(transport.getState(), 'disconnected');
    assert.ok(fetchCount >= 1, 'Should have made at least one fetch call');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('long-polling transport: send throws when not connected', () => {
  const transport = createLongPollingTransport();
  assert.throws(() => transport.send('data'), /not connected/i);
});

// ===========================================================================
// Transport Manager
// ===========================================================================

test('transport manager selects first supported transport', async () => {
  const unsupported = createMockTransport({ supported: false });
  const supported = createMockTransport({ supported: true });
  const manager = createTransportManager([unsupported, supported], { autoReconnect: false });
  await manager.connect('ws://localhost');
  assert.equal(manager.getState(), 'connected');
  await manager.disconnect();
});

test('transport manager passes assertRealtimePort', () => {
  const transport = createMockTransport();
  const manager = createTransportManager([transport], { autoReconnect: false });
  assertRealtimePort(manager);
});

test('transport manager throws when no transports are supported', async () => {
  const unsupported = createMockTransport({ supported: false });
  const manager = createTransportManager([unsupported], { autoReconnect: false });
  await assert.rejects(() => manager.connect('ws://localhost'), /No supported transport/);
});

test('transport manager falls back on failure', async () => {
  const failing = createMockTransport({ supported: true, failOnOpen: true });
  const fallback = createMockTransport({ supported: true });
  const manager = createTransportManager([failing, fallback], { autoReconnect: false });
  await manager.connect('ws://localhost');
  assert.equal(manager.getState(), 'connected');
  await manager.disconnect();
});

test('transport manager throws when all transports fail', async () => {
  const fail1 = createMockTransport({ supported: true, failOnOpen: true });
  const fail2 = createMockTransport({ supported: true, failOnOpen: true });
  const manager = createTransportManager([fail1, fail2], { autoReconnect: false });
  await assert.rejects(() => manager.connect('ws://localhost'), /All transports failed/);
});

test('transport manager channel multiplexing routes messages', async () => {
  const transport = createMockTransport();
  const manager = createTransportManager([transport], { autoReconnect: false });

  const chatMessages = [];
  const systemMessages = [];
  manager.subscribe('chat', (d) => chatMessages.push(d));
  manager.subscribe('system', (d) => systemMessages.push(d));

  await manager.connect('ws://localhost');

  transport._simulateMessage(JSON.stringify({ channel: 'chat', data: 'hello' }));
  transport._simulateMessage(JSON.stringify({ channel: 'system', data: 'update' }));
  transport._simulateMessage(JSON.stringify({ channel: 'chat', data: 'world' }));

  assert.deepEqual(chatMessages, ['hello', 'world']);
  assert.deepEqual(systemMessages, ['update']);

  await manager.disconnect();
});

test('transport manager unsubscribe removes specific callback', async () => {
  const transport = createMockTransport();
  const manager = createTransportManager([transport], { autoReconnect: false });

  const msgs = [];
  const cb = (d) => msgs.push(d);
  manager.subscribe('test', cb);
  await manager.connect('ws://localhost');

  transport._simulateMessage(JSON.stringify({ channel: 'test', data: 1 }));
  assert.equal(msgs.length, 1);

  manager.unsubscribe('test', cb);
  transport._simulateMessage(JSON.stringify({ channel: 'test', data: 2 }));
  assert.equal(msgs.length, 1);

  await manager.disconnect();
});

test('transport manager unsubscribe removes all callbacks for channel', async () => {
  const transport = createMockTransport();
  const manager = createTransportManager([transport], { autoReconnect: false });

  const msgs1 = [];
  const msgs2 = [];
  manager.subscribe('test', (d) => msgs1.push(d));
  manager.subscribe('test', (d) => msgs2.push(d));
  await manager.connect('ws://localhost');

  transport._simulateMessage(JSON.stringify({ channel: 'test', data: 1 }));
  assert.equal(msgs1.length, 1);
  assert.equal(msgs2.length, 1);

  manager.unsubscribe('test');
  transport._simulateMessage(JSON.stringify({ channel: 'test', data: 2 }));
  assert.equal(msgs1.length, 1);
  assert.equal(msgs2.length, 1);

  await manager.disconnect();
});

test('transport manager send throws when not connected', () => {
  const transport = createMockTransport();
  const manager = createTransportManager([transport], { autoReconnect: false });
  assert.throws(() => manager.send('chat', {}), /not connected/);
});

test('transport manager onConnectionChange fires on state transitions', async () => {
  const transport = createMockTransport();
  const manager = createTransportManager([transport], { autoReconnect: false });

  const states = [];
  manager.onConnectionChange((s) => states.push(s));

  await manager.connect('ws://localhost');
  await manager.disconnect();

  assert.ok(states.includes('connecting'));
  assert.ok(states.includes('connected'));
  assert.ok(states.includes('disconnected'));
});

test('transport manager getState reflects current connection state', async () => {
  const transport = createMockTransport();
  const manager = createTransportManager([transport], { autoReconnect: false });

  assert.equal(manager.getState(), 'disconnected');
  await manager.connect('ws://localhost');
  assert.equal(manager.getState(), 'connected');
  await manager.disconnect();
  assert.equal(manager.getState(), 'disconnected');
});

test('transport manager handles non-JSON messages as default channel', async () => {
  const transport = createMockTransport();
  const manager = createTransportManager([transport], { autoReconnect: false });

  const defaultMsgs = [];
  manager.subscribe('_default', (d) => defaultMsgs.push(d));

  await manager.connect('ws://localhost');
  transport._simulateMessage('plain text message');
  assert.equal(defaultMsgs.length, 1);
  assert.equal(defaultMsgs[0], 'plain text message');

  await manager.disconnect();
});

// ===========================================================================
// Transport Manager — reconnection
// ===========================================================================

test('transport manager reconnects after disconnect when autoReconnect is true', async () => {
  let openCount = 0;
  const transport = createMockTransport();
  const origOpen = transport.open;
  transport.open = async function (...args) {
    openCount++;
    return origOpen.apply(this, args);
  };

  const manager = createTransportManager([transport], {
    autoReconnect: true,
    reconnection: { baseDelay: 10, jitter: false },
  });

  await manager.connect('ws://localhost');
  assert.equal(openCount, 1);

  transport._simulateStateChange('disconnected');

  await new Promise((r) => setTimeout(r, 100));

  assert.ok(openCount >= 2, `Expected at least 2 open calls, got ${openCount}`);

  await manager.disconnect();
});
