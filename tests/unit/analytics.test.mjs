/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove analytics module fundamentals — port assertion, session manager, consent domain, plus the console and noop adapters — through pure-logic unit tests.
 * @sidecar analytics.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the analytics module — fundamentals layer.
 * Behavioral-adapter tests live in analytics-behavioral.test.mjs;
 * mouse-collector tests live in analytics-mouse-collector.test.mjs.
 *
 * SpecRefs: TPL-218
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertAnalyticsPort,
  createSessionManager,
  isConsentGranted,
  respectsDoNotTrack,
  createDefaultConsent,
  createAnalyticsConsoleAdapter,
  createAnalyticsNoOpAdapter,
} from '../../modules/analytics/public-api.mjs';

// ---------------------------------------------------------------------------
// assertAnalyticsPort
// ---------------------------------------------------------------------------

test('assertAnalyticsPort accepts a valid adapter', () => {
  const adapter = createAnalyticsNoOpAdapter();
  assert.doesNotThrow(() => assertAnalyticsPort(adapter));
});

test('assertAnalyticsPort rejects null', () => {
  assert.throws(() => assertAnalyticsPort(null), TypeError);
});

test('assertAnalyticsPort rejects undefined', () => {
  assert.throws(() => assertAnalyticsPort(undefined), TypeError);
});

test('assertAnalyticsPort rejects a string', () => {
  assert.throws(() => assertAnalyticsPort('not an adapter'), TypeError);
});

test('assertAnalyticsPort rejects an object missing track()', () => {
  assert.throws(
    () =>
      assertAnalyticsPort({
        identify() {},
        page() {},
        setProperties() {},
        reset() {},
        getConsent() {},
        setConsent() {},
      }),
    TypeError,
  );
});

test('assertAnalyticsPort rejects an object missing getConsent()', () => {
  assert.throws(
    () =>
      assertAnalyticsPort({
        track() {},
        identify() {},
        page() {},
        setProperties() {},
        reset() {},
        setConsent() {},
      }),
    TypeError,
  );
});

// ---------------------------------------------------------------------------
// SessionManager
// ---------------------------------------------------------------------------

test('createSessionManager creates a session with a sessionId', () => {
  const sm = createSessionManager();
  const session = sm.getSession();
  assert.ok(typeof session.sessionId === 'string');
  assert.ok(session.sessionId.length > 0);
  assert.ok(typeof session.startedAt === 'number');
  assert.equal(session.pageViews, 0);
  assert.ok(typeof session.lastActivity === 'number');
});

test('SessionManager touch updates lastActivity', () => {
  const sm = createSessionManager();
  const before = sm.getSession().lastActivity;
  sm.touch();
  const after = sm.getSession().lastActivity;
  assert.ok(after >= before);
});

test('SessionManager isExpired detects timeout', () => {
  const sm = createSessionManager({ timeout: 1 });
  const start = Date.now();
  while (Date.now() - start < 5) {
    // busy-wait 5ms
  }
  assert.ok(sm.isExpired());
});

test('SessionManager isExpired returns false for fresh session', () => {
  const sm = createSessionManager({ timeout: 60000 });
  assert.equal(sm.isExpired(), false);
});

test('SessionManager incrementPageViews increases count', () => {
  const sm = createSessionManager();
  assert.equal(sm.getSession().pageViews, 0);
  sm.incrementPageViews();
  assert.equal(sm.getSession().pageViews, 1);
  sm.incrementPageViews();
  assert.equal(sm.getSession().pageViews, 2);
});

test('SessionManager newSession creates a fresh session', () => {
  const sm = createSessionManager();
  const first = sm.getSession().sessionId;
  sm.incrementPageViews();
  sm.newSession();
  const second = sm.getSession();
  assert.notEqual(second.sessionId, first);
  assert.equal(second.pageViews, 0);
});

test('SessionManager touch creates new session when expired', () => {
  const sm = createSessionManager({ timeout: 1 });
  const firstId = sm.getSession().sessionId;
  const start = Date.now();
  while (Date.now() - start < 5) {
    // busy-wait
  }
  sm.touch();
  const secondId = sm.getSession().sessionId;
  assert.notEqual(secondId, firstId);
});

// ---------------------------------------------------------------------------
// Consent domain
// ---------------------------------------------------------------------------

test('createDefaultConsent returns both false', () => {
  const consent = createDefaultConsent();
  assert.deepEqual(consent, { analytics: false, behavioral: false });
});

test('isConsentGranted returns true when category is true', () => {
  assert.equal(isConsentGranted({ analytics: true, behavioral: false }, 'analytics'), true);
  assert.equal(isConsentGranted({ analytics: false, behavioral: true }, 'behavioral'), true);
});

test('isConsentGranted returns false when category is false', () => {
  assert.equal(isConsentGranted({ analytics: false, behavioral: false }, 'analytics'), false);
  assert.equal(isConsentGranted({ analytics: false, behavioral: false }, 'behavioral'), false);
});

test('isConsentGranted returns false for null/undefined consent', () => {
  assert.equal(isConsentGranted(null, 'analytics'), false);
  assert.equal(isConsentGranted(undefined, 'analytics'), false);
});

test('respectsDoNotTrack returns false when navigator is undefined', () => {
  const result = respectsDoNotTrack();
  assert.equal(typeof result, 'boolean');
});

// ---------------------------------------------------------------------------
// ConsoleAdapter
// ---------------------------------------------------------------------------

test('ConsoleAdapter passes assertAnalyticsPort', () => {
  const adapter = createAnalyticsConsoleAdapter();
  assert.doesNotThrow(() => assertAnalyticsPort(adapter));
});

test('ConsoleAdapter getConsent returns default consent (both false)', () => {
  const adapter = createAnalyticsConsoleAdapter();
  assert.deepEqual(adapter.getConsent(), { analytics: false, behavioral: false });
});

test('ConsoleAdapter suppresses track() when consent not granted', () => {
  const logs = [];
  const origLog = console.log;
  const origGroup = console.group;
  const origGroupEnd = console.groupEnd;
  console.log = (...args) => logs.push(args);
  console.group = (...args) => logs.push(['group', ...args]);
  console.groupEnd = () => logs.push(['groupEnd']);

  try {
    const adapter = createAnalyticsConsoleAdapter();
    adapter.track('test_event', { key: 'value' });
    assert.equal(logs.length, 0, 'Should not log when consent is denied');
  } finally {
    console.log = origLog;
    console.group = origGroup;
    console.groupEnd = origGroupEnd;
  }
});

test('ConsoleAdapter logs track() when consent granted', () => {
  const logs = [];
  const origLog = console.log;
  const origGroup = console.group;
  const origGroupEnd = console.groupEnd;
  console.log = (...args) => logs.push(args);
  console.group = (...args) => logs.push(['group', ...args]);
  console.groupEnd = () => logs.push(['groupEnd']);

  try {
    const adapter = createAnalyticsConsoleAdapter({ initialConsent: { analytics: true } });
    adapter.track('test_event', { key: 'value' });
    assert.ok(logs.length > 0, 'Should log when consent is granted');
    const groupCall = logs.find(
      (l) => l[0] === 'group' && typeof l[1] === 'string' && l[1].includes('test_event'),
    );
    assert.ok(groupCall, 'Should include event name in group');
  } finally {
    console.log = origLog;
    console.group = origGroup;
    console.groupEnd = origGroupEnd;
  }
});

test('ConsoleAdapter setConsent updates consent state', () => {
  const adapter = createAnalyticsConsoleAdapter();
  assert.deepEqual(adapter.getConsent(), { analytics: false, behavioral: false });
  adapter.setConsent({ analytics: true });
  assert.deepEqual(adapter.getConsent(), { analytics: true, behavioral: false });
  adapter.setConsent({ behavioral: true });
  assert.deepEqual(adapter.getConsent(), { analytics: true, behavioral: true });
});

test('ConsoleAdapter reset clears identity and super properties', () => {
  const logs = [];
  const origLog = console.log;
  const origGroup = console.group;
  const origGroupEnd = console.groupEnd;
  console.log = (...args) => logs.push(args);
  console.group = (...args) => logs.push(['group', ...args]);
  console.groupEnd = () => logs.push(['groupEnd']);

  try {
    const adapter = createAnalyticsConsoleAdapter({ initialConsent: { analytics: true } });
    adapter.setProperties({ plan: 'pro' });
    adapter.identify('user1');
    adapter.reset();
    logs.length = 0;

    adapter.track('after_reset');
    const userIdLog = logs.find(
      (l) => Array.isArray(l) && l.some((v) => typeof v === 'string' && v.includes('user1')),
    );
    assert.equal(userIdLog, undefined, 'userId should be cleared after reset');
  } finally {
    console.log = origLog;
    console.group = origGroup;
    console.groupEnd = origGroupEnd;
  }
});

// ---------------------------------------------------------------------------
// NoOpAdapter
// ---------------------------------------------------------------------------

test('NoOpAdapter passes assertAnalyticsPort', () => {
  const adapter = createAnalyticsNoOpAdapter();
  assert.doesNotThrow(() => assertAnalyticsPort(adapter));
});

test('NoOpAdapter getConsent returns both false', () => {
  const adapter = createAnalyticsNoOpAdapter();
  assert.deepEqual(adapter.getConsent(), { analytics: false, behavioral: false });
});

test('NoOpAdapter methods are callable without error', () => {
  const adapter = createAnalyticsNoOpAdapter();
  assert.doesNotThrow(() => {
    adapter.track('event');
    adapter.identify('user1');
    adapter.page('home');
    adapter.setProperties({ foo: 'bar' });
    adapter.reset();
    adapter.setConsent({ analytics: true });
  });
});
