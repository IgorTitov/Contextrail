/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the analytics MouseCollector — sample collection, batching/flush semantics, lifecycle, and visibility-aware throttling.
 * @sidecar analytics-mouse-collector.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the analytics module — MouseCollector.
 * Fundamentals (port, session, consent, console/noop adapters) live in
 * analytics.test.mjs; behavioral-adapter tests live in
 * analytics-behavioral.test.mjs.
 *
 * SpecRefs: TPL-218
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createMouseCollector } from '../../modules/analytics/public-api.mjs';

test('MouseCollector collects samples on mousemove', () => {
  const flushed = [];
  const listeners = {};
  const origDocument = globalThis.document;

  globalThis.document = {
    addEventListener(event, handler) { listeners[event] = handler; },
    removeEventListener(event) { delete listeners[event]; },
    hidden: false,
  };
  globalThis.window = globalThis.window || {};
  const origInnerWidth = globalThis.window.innerWidth;
  const origInnerHeight = globalThis.window.innerHeight;
  globalThis.window.innerWidth = 1024;
  globalThis.window.innerHeight = 768;

  try {
    const collector = createMouseCollector({
      sampleInterval: 0,
      batchSize: 3,
      flushFn: (samples) => flushed.push([...samples]),
    });

    collector.start();

    for (let i = 0; i < 3; i++) {
      listeners.mousemove({ clientX: i * 10, clientY: i * 20 });
    }

    assert.equal(flushed.length, 1, 'Should flush after batchSize');
    assert.equal(flushed[0].length, 3);
    assert.equal(flushed[0][0].x, 0);
    assert.equal(flushed[0][0].y, 0);
    assert.equal(flushed[0][0].viewportWidth, 1024);
    assert.equal(flushed[0][0].viewportHeight, 768);

    collector.destroy();
  } finally {
    globalThis.document = origDocument;
    globalThis.window.innerWidth = origInnerWidth;
    globalThis.window.innerHeight = origInnerHeight;
  }
});

test('MouseCollector start/stop lifecycle', () => {
  const listeners = {};
  const origDocument = globalThis.document;

  globalThis.document = {
    addEventListener(event, handler) { listeners[event] = handler; },
    removeEventListener(event) { delete listeners[event]; },
    hidden: false,
  };

  try {
    const collector = createMouseCollector();
    collector.start();
    assert.ok(listeners.mousemove, 'mousemove listener should be registered');
    assert.ok(listeners.visibilitychange, 'visibilitychange listener should be registered');

    collector.stop();
    assert.equal(listeners.mousemove, undefined, 'mousemove listener should be removed');
    assert.equal(
      listeners.visibilitychange,
      undefined,
      'visibilitychange listener should be removed',
    );
  } finally {
    globalThis.document = origDocument;
  }
});

test('MouseCollector destroy flushes remaining samples', () => {
  const flushed = [];
  const listeners = {};
  const origDocument = globalThis.document;

  globalThis.document = {
    addEventListener(event, handler) { listeners[event] = handler; },
    removeEventListener(event) { delete listeners[event]; },
    hidden: false,
  };
  globalThis.window = globalThis.window || {};
  const origInnerWidth = globalThis.window.innerWidth;
  const origInnerHeight = globalThis.window.innerHeight;
  globalThis.window.innerWidth = 1024;
  globalThis.window.innerHeight = 768;

  try {
    const collector = createMouseCollector({
      sampleInterval: 0,
      batchSize: 100,
      flushFn: (samples) => flushed.push([...samples]),
    });

    collector.start();
    listeners.mousemove({ clientX: 10, clientY: 20 });
    listeners.mousemove({ clientX: 30, clientY: 40 });

    assert.equal(flushed.length, 0, 'Should not flush yet');
    assert.equal(collector.getPendingCount(), 2);

    collector.destroy();
    assert.equal(flushed.length, 1, 'Should flush remaining on destroy');
    assert.equal(flushed[0].length, 2);
  } finally {
    globalThis.document = origDocument;
    globalThis.window.innerWidth = origInnerWidth;
    globalThis.window.innerHeight = origInnerHeight;
  }
});

test('MouseCollector reduces sample rate when page not focused', () => {
  const listeners = {};
  const origDocument = globalThis.document;

  const doc = {
    addEventListener(event, handler) { listeners[event] = handler; },
    removeEventListener(event) { delete listeners[event]; },
    hidden: false,
  };
  globalThis.document = doc;
  globalThis.window = globalThis.window || {};
  globalThis.window.innerWidth = 1024;
  globalThis.window.innerHeight = 768;

  try {
    const flushed = [];
    const collector = createMouseCollector({
      sampleInterval: 50,
      batchSize: 100,
      flushFn: (samples) => flushed.push([...samples]),
    });

    collector.start();

    doc.hidden = true;
    listeners.visibilitychange();

    listeners.mousemove({ clientX: 1, clientY: 1 });
    const countAfterFirst = collector.getPendingCount();

    listeners.mousemove({ clientX: 2, clientY: 2 });
    const countAfterSecond = collector.getPendingCount();

    assert.equal(countAfterFirst, 1);
    assert.equal(countAfterSecond, 1, 'Second sample should be throttled when page not focused');

    collector.destroy();
  } finally {
    globalThis.document = origDocument;
  }
});
