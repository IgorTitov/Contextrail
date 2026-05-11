/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the analytics BehavioralAdapter — DOM-event lifecycle, click forwarding, behavioral consent gating, and scroll-threshold reporting.
 * @sidecar analytics-behavioral.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the analytics module — BehavioralAdapter.
 * Fundamentals (port, session, consent, console/noop adapters) live in
 * analytics.test.mjs; mouse-collector tests live in
 * analytics-mouse-collector.test.mjs.
 *
 * SpecRefs: TPL-218
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAnalyticsConsoleAdapter,
  createAnalyticsNoOpAdapter,
  createBehavioralAdapter,
} from '../../modules/analytics/public-api.mjs';

test('BehavioralAdapter wraps inner adapter', () => {
  const inner = createAnalyticsNoOpAdapter();
  const behavioral = createBehavioralAdapter(inner);
  assert.ok(behavioral);
  assert.equal(typeof behavioral.startTracking, 'function');
  assert.equal(typeof behavioral.stopTracking, 'function');
  assert.equal(typeof behavioral.destroy, 'function');
  assert.equal(typeof behavioral.observe, 'function');
  assert.equal(typeof behavioral.unobserve, 'function');
});

test('BehavioralAdapter is not tracking by default', () => {
  const inner = createAnalyticsNoOpAdapter();
  const behavioral = createBehavioralAdapter(inner);
  assert.equal(behavioral.isTracking(), false);
});

test('BehavioralAdapter startTracking/stopTracking lifecycle', () => {
  const listeners = {};
  const origDocument = globalThis.document;
  const origWindow = globalThis.window;

  globalThis.document = {
    body: {
      addEventListener(event, handler) {
        listeners[event] = handler;
      },
      removeEventListener(event) {
        delete listeners[event];
      },
    },
    documentElement: { scrollHeight: 1000 },
    hidden: false,
  };
  globalThis.window = {
    addEventListener(event, handler) {
      listeners[`window_${event}`] = handler;
    },
    removeEventListener(event) {
      delete listeners[`window_${event}`];
    },
    scrollY: 0,
    innerHeight: 500,
  };

  try {
    const inner = createAnalyticsConsoleAdapter({
      initialConsent: { analytics: true, behavioral: true },
    });
    const behavioral = createBehavioralAdapter(inner);

    behavioral.startTracking();
    assert.equal(behavioral.isTracking(), true);
    assert.ok(listeners.click, 'click listener should be registered');
    assert.ok(listeners.window_scroll, 'scroll listener should be registered');

    behavioral.stopTracking();
    assert.equal(behavioral.isTracking(), false);
    assert.equal(listeners.click, undefined, 'click listener should be removed');
    assert.equal(listeners.window_scroll, undefined, 'scroll listener should be removed');
  } finally {
    globalThis.document = origDocument;
    globalThis.window = origWindow;
  }
});

test('BehavioralAdapter click events forwarded as track() calls', () => {
  const tracked = [];
  const inner = createAnalyticsConsoleAdapter({
    initialConsent: { analytics: true, behavioral: true },
  });
  inner.track = (name, props) => {
    tracked.push({ name, props });
  };

  const listeners = {};
  const origDocument = globalThis.document;
  const origWindow = globalThis.window;

  globalThis.document = {
    body: {
      addEventListener(event, handler) {
        listeners[event] = handler;
      },
      removeEventListener(event) {
        delete listeners[event];
      },
    },
    documentElement: { scrollHeight: 1000 },
    hidden: false,
  };
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
    scrollY: 0,
    innerHeight: 500,
  };

  try {
    const behavioral = createBehavioralAdapter(inner);
    behavioral.startTracking();

    const fakeEvent = {
      target: {
        tagName: 'BUTTON',
        id: 'submit-btn',
        className: 'btn primary large extra',
      },
      clientX: 100,
      clientY: 200,
    };
    listeners.click(fakeEvent);

    assert.equal(tracked.length, 1);
    assert.equal(tracked[0].name, 'behavior:click');
    assert.equal(tracked[0].props.tagName, 'BUTTON');
    assert.equal(tracked[0].props.id, 'submit-btn');
    assert.ok(tracked[0].props.className.includes('btn'));
    assert.ok(!tracked[0].props.className.includes('extra'));
    assert.equal(tracked[0].props.x, 100);
    assert.equal(tracked[0].props.y, 200);

    behavioral.destroy();
  } finally {
    globalThis.document = origDocument;
    globalThis.window = origWindow;
  }
});

test('BehavioralAdapter suppresses events when behavioral consent is false', () => {
  const tracked = [];
  const inner = createAnalyticsConsoleAdapter({
    initialConsent: { analytics: true, behavioral: false },
  });
  inner.track = (name, props) => {
    tracked.push({ name, props });
  };

  const listeners = {};
  const origDocument = globalThis.document;
  const origWindow = globalThis.window;

  globalThis.document = {
    body: {
      addEventListener(event, handler) {
        listeners[event] = handler;
      },
      removeEventListener(event) {
        delete listeners[event];
      },
    },
    documentElement: { scrollHeight: 1000 },
    hidden: false,
  };
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
    scrollY: 0,
    innerHeight: 500,
  };

  try {
    const behavioral = createBehavioralAdapter(inner);
    behavioral.startTracking();

    const fakeEvent = {
      target: { tagName: 'BUTTON', id: '', className: '' },
      clientX: 0,
      clientY: 0,
    };
    listeners.click(fakeEvent);

    assert.equal(tracked.length, 0, 'Should not track when behavioral consent is false');

    behavioral.destroy();
  } finally {
    globalThis.document = origDocument;
    globalThis.window = origWindow;
  }
});

test('BehavioralAdapter scroll tracking at thresholds', () => {
  const tracked = [];
  const inner = createAnalyticsConsoleAdapter({
    initialConsent: { analytics: true, behavioral: true },
  });
  inner.track = (name, props) => {
    tracked.push({ name, props });
  };

  const listeners = {};
  const origDocument = globalThis.document;
  const origWindow = globalThis.window;
  const origSetTimeout = globalThis.setTimeout;
  const origClearTimeout = globalThis.clearTimeout;

  let pendingFn = null;
  globalThis.setTimeout = (fn) => {
    pendingFn = fn;
    return 1;
  };
  globalThis.clearTimeout = () => {
    pendingFn = null;
  };

  globalThis.document = {
    body: { addEventListener() {}, removeEventListener() {} },
    documentElement: { scrollHeight: 2000 },
    hidden: false,
  };
  globalThis.window = {
    addEventListener(event, handler) {
      listeners[`window_${event}`] = handler;
    },
    removeEventListener(event) {
      delete listeners[`window_${event}`];
    },
    scrollY: 0,
    innerHeight: 500,
  };

  try {
    const behavioral = createBehavioralAdapter(inner, { scrollThresholds: [25, 50, 75, 100] });
    behavioral.startTracking();

    globalThis.window.scrollY = 375; // 375 / 1500 = 25%
    listeners.window_scroll();
    if (pendingFn) pendingFn();

    assert.ok(tracked.some((e) => e.name === 'behavior:scroll' && e.props.depth === 25));

    globalThis.window.scrollY = 750;
    pendingFn = null;
    listeners.window_scroll();
    if (pendingFn) pendingFn();

    assert.ok(tracked.some((e) => e.name === 'behavior:scroll' && e.props.depth === 50));

    const scrollEvents25 = tracked.filter(
      (e) => e.name === 'behavior:scroll' && e.props.depth === 25,
    );
    assert.equal(scrollEvents25.length, 1, 'Should report 25% threshold only once');

    behavioral.destroy();
  } finally {
    globalThis.document = origDocument;
    globalThis.window = origWindow;
    globalThis.setTimeout = origSetTimeout;
    globalThis.clearTimeout = origClearTimeout;
  }
});
