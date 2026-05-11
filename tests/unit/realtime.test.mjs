/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the realtime domain logic — connection state machine, reconnection strategy, heartbeat, and port-shape assertions — through pure-logic unit tests.
 * @sidecar realtime.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the realtime module — domain layer.
 * Transport adapters and the transport manager live in
 * realtime-transports.test.mjs; the server-side wsServerTransport
 * lives in realtime-server.test.mjs.
 *
 * SpecRefs: TPL-218
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertRealtimePort,
  assertTransportPort,
  ConnectionStates,
  createConnectionStateMachine,
  createReconnectionStrategy,
  createHeartbeat,
} from '../../modules/realtime/public-api.mjs';

// ---------------------------------------------------------------------------
// Helpers: minimal transport mock (used by port-assertion tests below)
// ---------------------------------------------------------------------------

/**
 * Create a mock transport that satisfies TransportPort.
 * @param {object} [overrides]
 * @param {boolean} [overrides.supported=true]
 * @param {boolean} [overrides.failOnOpen=false]
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
// Connection State Machine
// ===========================================================================

test('ConnectionStates enum has all expected values', () => {
  assert.equal(ConnectionStates.DISCONNECTED, 'disconnected');
  assert.equal(ConnectionStates.CONNECTING, 'connecting');
  assert.equal(ConnectionStates.CONNECTED, 'connected');
  assert.equal(ConnectionStates.RECONNECTING, 'reconnecting');
  assert.equal(ConnectionStates.FAILED, 'failed');
});

test('state machine starts in disconnected state by default', () => {
  const sm = createConnectionStateMachine();
  assert.equal(sm.getState(), 'disconnected');
});

test('state machine starts in custom initial state', () => {
  const sm = createConnectionStateMachine('failed');
  assert.equal(sm.getState(), 'failed');
});

test('valid transition: disconnected -> connecting', () => {
  const sm = createConnectionStateMachine();
  sm.transition('connecting');
  assert.equal(sm.getState(), 'connecting');
});

test('valid transition: connecting -> connected', () => {
  const sm = createConnectionStateMachine('connecting');
  sm.transition('connected');
  assert.equal(sm.getState(), 'connected');
});

test('valid transition: connecting -> failed', () => {
  const sm = createConnectionStateMachine('connecting');
  sm.transition('failed');
  assert.equal(sm.getState(), 'failed');
});

test('valid transition: connected -> reconnecting', () => {
  const sm = createConnectionStateMachine('connected');
  sm.transition('reconnecting');
  assert.equal(sm.getState(), 'reconnecting');
});

test('valid transition: connected -> disconnected', () => {
  const sm = createConnectionStateMachine('connected');
  sm.transition('disconnected');
  assert.equal(sm.getState(), 'disconnected');
});

test('valid transition: reconnecting -> connecting', () => {
  const sm = createConnectionStateMachine('reconnecting');
  sm.transition('connecting');
  assert.equal(sm.getState(), 'connecting');
});

test('valid transition: reconnecting -> failed', () => {
  const sm = createConnectionStateMachine('reconnecting');
  sm.transition('failed');
  assert.equal(sm.getState(), 'failed');
});

test('valid transition: failed -> connecting', () => {
  const sm = createConnectionStateMachine('failed');
  sm.transition('connecting');
  assert.equal(sm.getState(), 'connecting');
});

test('invalid transition throws: disconnected -> connected', () => {
  const sm = createConnectionStateMachine();
  assert.throws(() => sm.transition('connected'), /Invalid state transition/);
});

test('invalid transition throws: connecting -> disconnected', () => {
  const sm = createConnectionStateMachine('connecting');
  assert.throws(() => sm.transition('disconnected'), /Invalid state transition/);
});

test('invalid transition throws: connected -> connecting', () => {
  const sm = createConnectionStateMachine('connected');
  assert.throws(() => sm.transition('connecting'), /Invalid state transition/);
});

test('invalid transition throws: failed -> connected', () => {
  const sm = createConnectionStateMachine('failed');
  assert.throws(() => sm.transition('connected'), /Invalid state transition/);
});

test('state machine emits state changes to listeners', () => {
  const sm = createConnectionStateMachine();
  const changes = [];
  sm.onStateChange((s) => changes.push(s));
  sm.transition('connecting');
  sm.transition('connected');
  assert.deepEqual(changes, ['connecting', 'connected']);
});

// ===========================================================================
// Reconnection Strategy
// ===========================================================================

test('reconnection starts at attempt 0', () => {
  const strategy = createReconnectionStrategy();
  assert.equal(strategy.attempt, 0);
});

test('reconnection advances attempt on nextDelay()', () => {
  const strategy = createReconnectionStrategy({ jitter: false });
  strategy.nextDelay();
  assert.equal(strategy.attempt, 1);
  strategy.nextDelay();
  assert.equal(strategy.attempt, 2);
});

test('reconnection exponential backoff without jitter', () => {
  const strategy = createReconnectionStrategy({
    baseDelay: 100,
    multiplier: 2,
    maxDelay: 10000,
    jitter: false,
  });
  assert.equal(strategy.nextDelay(), 100);
  assert.equal(strategy.nextDelay(), 200);
  assert.equal(strategy.nextDelay(), 400);
  assert.equal(strategy.nextDelay(), 800);
});

test('reconnection respects maxDelay', () => {
  const strategy = createReconnectionStrategy({
    baseDelay: 100,
    multiplier: 2,
    maxDelay: 300,
    jitter: false,
  });
  strategy.nextDelay();
  strategy.nextDelay();
  assert.equal(strategy.nextDelay(), 300);
  assert.equal(strategy.nextDelay(), 300);
});

test('reconnection with jitter produces values in expected range', () => {
  const strategy = createReconnectionStrategy({
    baseDelay: 1000,
    multiplier: 2,
    jitter: true,
  });
  const delay = strategy.nextDelay();
  assert.ok(delay >= 500, `delay ${delay} should be >= 500`);
  assert.ok(delay <= 1000, `delay ${delay} should be <= 1000`);
});

test('reconnection reset clears attempt counter', () => {
  const strategy = createReconnectionStrategy({ jitter: false, baseDelay: 100, multiplier: 2 });
  strategy.nextDelay();
  strategy.nextDelay();
  strategy.reset();
  assert.equal(strategy.attempt, 0);
  assert.equal(strategy.nextDelay(), 100);
});

// ===========================================================================
// Heartbeat
// ===========================================================================

test('heartbeat fires sendFn on interval', async () => {
  const hb = createHeartbeat({ interval: 50, timeout: 200 });
  let sendCount = 0;
  hb.start(
    () => { sendCount++; },
    () => {},
  );
  await new Promise((r) => setTimeout(r, 180));
  hb.stop();
  assert.ok(sendCount >= 2, `sendFn should have fired at least 2 times, got ${sendCount}`);
});

test('heartbeat calls onTimeout when no pong received', async () => {
  const hb = createHeartbeat({ interval: 50, timeout: 50 });
  let timedOut = false;
  hb.start(
    () => {},
    () => { timedOut = true; },
  );
  await new Promise((r) => setTimeout(r, 200));
  hb.stop();
  assert.ok(timedOut, 'onTimeout should have fired');
});

test('heartbeat receivedPong prevents timeout', async () => {
  const hb = createHeartbeat({ interval: 30, timeout: 50 });
  let timedOut = false;
  hb.start(
    () => { hb.receivedPong(); },
    () => { timedOut = true; },
  );
  await new Promise((r) => setTimeout(r, 120));
  hb.stop();
  assert.ok(!timedOut, 'onTimeout should NOT have fired when pong is received');
});

test('heartbeat stop cancels all timers', async () => {
  const hb = createHeartbeat({ interval: 30, timeout: 50 });
  let sendCount = 0;
  let timedOut = false;
  hb.start(
    () => { sendCount++; },
    () => { timedOut = true; },
  );
  hb.stop();
  const countAtStop = sendCount;
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(sendCount, countAtStop, 'No more sends after stop');
  assert.ok(!timedOut, 'No timeout after stop');
});

// ===========================================================================
// Port Assertions
// ===========================================================================

test('assertTransportPort accepts valid adapter', () => {
  const transport = createMockTransport();
  assert.doesNotThrow(() => assertTransportPort(transport));
});

test('assertTransportPort rejects null', () => {
  assert.throws(() => assertTransportPort(null), /non-null object/);
});

test('assertTransportPort rejects missing methods', () => {
  assert.throws(() => assertTransportPort({}), /open/);
  assert.throws(() => assertTransportPort({ open() {} }), /close/);
  assert.throws(() => assertTransportPort({ open() {}, close() {} }), /send/);
});

test('assertRealtimePort rejects null', () => {
  assert.throws(() => assertRealtimePort(null), /non-null object/);
});

test('assertRealtimePort rejects missing methods', () => {
  assert.throws(() => assertRealtimePort({}), /connect/);
});

test('assertRealtimePort accepts valid adapter', () => {
  const adapter = {
    connect() {},
    disconnect() {},
    send() {},
    subscribe() {},
    unsubscribe() {},
    onConnectionChange() {},
    getState() {},
  };
  assert.doesNotThrow(() => assertRealtimePort(adapter));
});
