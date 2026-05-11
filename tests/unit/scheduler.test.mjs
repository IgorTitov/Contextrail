/* @HEADER
 * @version 0.7.108 | 2026-05-06
 * @purpose Describe the role of scheduler-test in this repository.
 * @sidecar scheduler.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertSchedulerPort,
  parseCronLike,
  addJitter,
  createIntervalAdapter,
  createIdleAdapter,
  createVisibilityAwareAdapter,
} from '../../modules/scheduler/public-api.mjs';

// ---------------------------------------------------------------------------
// Helper: wait for a given number of ms
// ---------------------------------------------------------------------------
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===========================================================================
// assertSchedulerPort
// ===========================================================================

test('assertSchedulerPort accepts a valid adapter', () => {
  const adapter = createIntervalAdapter();
  assert.doesNotThrow(() => assertSchedulerPort(adapter));
  adapter.destroy();
});

test('assertSchedulerPort rejects null', () => {
  assert.throws(() => assertSchedulerPort(null), TypeError);
});

test('assertSchedulerPort rejects non-object', () => {
  assert.throws(() => assertSchedulerPort('string'), TypeError);
});

test('assertSchedulerPort rejects object missing methods', () => {
  assert.throws(() => assertSchedulerPort({ schedule: () => {} }), TypeError);
});

test('assertSchedulerPort rejects empty object', () => {
  assert.throws(() => assertSchedulerPort({}), TypeError);
});

// ===========================================================================
// parseCronLike
// ===========================================================================

test('parseCronLike parses "every 5s"', () => {
  assert.equal(parseCronLike('every 5s'), 5000);
});

test('parseCronLike parses "every 30m"', () => {
  assert.equal(parseCronLike('every 30m'), 1_800_000);
});

test('parseCronLike parses "every 2h"', () => {
  assert.equal(parseCronLike('every 2h'), 7_200_000);
});

test('parseCronLike parses "every 1d"', () => {
  assert.equal(parseCronLike('every 1d'), 86_400_000);
});

test('parseCronLike passes through raw number', () => {
  assert.equal(parseCronLike(42), 42);
});

test('parseCronLike throws on invalid expression', () => {
  assert.throws(() => parseCronLike('invalid'), Error);
});

test('parseCronLike throws on empty string', () => {
  assert.throws(() => parseCronLike(''), Error);
});

test('parseCronLike throws on unsupported unit', () => {
  assert.throws(() => parseCronLike('every 5x'), Error);
});

// ===========================================================================
// addJitter
// ===========================================================================

test('addJitter returns value within expected range', () => {
  const base = 100;
  const jitter = 20;
  for (let i = 0; i < 50; i++) {
    const result = addJitter(base, jitter);
    assert.ok(result >= 1, `result ${result} should be >= 1`);
    assert.ok(
      result >= base - jitter - 1 && result <= base + jitter + 1,
      `result ${result} should be near ${base}`,
    );
  }
});

test('addJitter result is always >= 1 even with large jitter', () => {
  for (let i = 0; i < 50; i++) {
    const result = addJitter(1, 100);
    assert.ok(result >= 1, `result ${result} should be >= 1`);
  }
});

// ===========================================================================
// IntervalAdapter
// ===========================================================================

test('IntervalAdapter passes assertSchedulerPort', () => {
  const adapter = createIntervalAdapter();
  assert.doesNotThrow(() => assertSchedulerPort(adapter));
  adapter.destroy();
});

test('IntervalAdapter schedule runs task at interval', { timeout: 5000 }, async () => {
  const adapter = createIntervalAdapter();
  let count = 0;
  const handle = adapter.schedule(
    () => {
      count++;
    },
    { interval: 20 },
  );

  await wait(90);
  adapter.destroy();

  assert.ok(count >= 2, `expected at least 2 runs, got ${count}`);
});

test('IntervalAdapter immediate option runs task immediately', { timeout: 5000 }, async () => {
  const adapter = createIntervalAdapter();
  let count = 0;
  adapter.schedule(
    () => {
      count++;
    },
    { interval: 200, immediate: true },
  );

  // Immediate run is synchronous
  assert.ok(count >= 1, `expected immediate run, got ${count}`);
  adapter.destroy();
});

test('IntervalAdapter cancel stops execution', { timeout: 5000 }, async () => {
  const adapter = createIntervalAdapter();
  let count = 0;
  const handle = adapter.schedule(
    () => {
      count++;
    },
    { interval: 15 },
  );

  await wait(50);
  const countAtCancel = count;
  handle.cancel();
  await wait(50);

  assert.equal(count, countAtCancel, 'count should not increase after cancel');

  const info = adapter.getSchedule(handle.id);
  assert.equal(info.status, 'cancelled');
  adapter.destroy();
});

test('IntervalAdapter pause and resume work correctly', { timeout: 5000 }, async () => {
  const adapter = createIntervalAdapter();
  let count = 0;
  const handle = adapter.schedule(
    () => {
      count++;
    },
    { interval: 20 },
  );

  await wait(60);
  const countAtPause = count;
  handle.pause();

  const infoPaused = adapter.getSchedule(handle.id);
  assert.equal(infoPaused.status, 'paused');

  await wait(60);
  assert.equal(count, countAtPause, 'count should not increase while paused');

  handle.resume();
  const infoResumed = adapter.getSchedule(handle.id);
  assert.equal(infoResumed.status, 'active');

  await wait(60);
  assert.ok(count > countAtPause, 'count should increase after resume');
  adapter.destroy();
});

test('IntervalAdapter maxRuns auto-completes schedule', { timeout: 5000 }, async () => {
  const adapter = createIntervalAdapter();
  let count = 0;
  const handle = adapter.schedule(
    () => {
      count++;
    },
    { interval: 15, maxRuns: 3 },
  );

  await wait(200);

  assert.equal(count, 3, 'should stop after maxRuns');
  const info = adapter.getSchedule(handle.id);
  assert.equal(info.status, 'completed');
  adapter.destroy();
});

test(
  'IntervalAdapter maxRuns 1 with immediate completes after one run',
  { timeout: 5000 },
  async () => {
    const adapter = createIntervalAdapter();
    let count = 0;
    const handle = adapter.schedule(
      () => {
        count++;
      },
      { interval: 200, maxRuns: 1, immediate: true },
    );

    assert.equal(count, 1);
    const info = adapter.getSchedule(handle.id);
    assert.equal(info.status, 'completed');
    adapter.destroy();
  },
);

test(
  'IntervalAdapter onError catches task errors without cancelling',
  { timeout: 5000 },
  async () => {
    const adapter = createIntervalAdapter();
    const errors = [];
    let count = 0;
    const handle = adapter.schedule(
      () => {
        count++;
        throw new Error('boom');
      },
      {
        interval: 20,
        onError: (err) => errors.push(err.message),
      },
    );

    await wait(80);
    adapter.destroy();

    assert.ok(count >= 2, `task should have run multiple times despite errors, got ${count}`);
    assert.ok(errors.length >= 2, `errors should have been caught, got ${errors.length}`);
    assert.ok(errors.every((m) => m === 'boom'));
  },
);

test('IntervalAdapter jitter modifies interval', { timeout: 5000 }, async () => {
  const adapter = createIntervalAdapter();
  let count = 0;
  const handle = adapter.schedule(
    () => {
      count++;
    },
    { interval: 30, jitter: 10 },
  );

  await wait(150);
  adapter.destroy();

  // With jitter, timing is less predictable, but should still run
  assert.ok(count >= 1, `should have run at least once with jitter, got ${count}`);
});

test('IntervalAdapter tracks runCount and lastRun', { timeout: 5000 }, async () => {
  const adapter = createIntervalAdapter();
  const handle = adapter.schedule(() => {}, { interval: 15 });

  const infoBefore = adapter.getSchedule(handle.id);
  assert.equal(infoBefore.runCount, 0);
  assert.equal(infoBefore.lastRun, undefined);

  await wait(50);

  const infoAfter = adapter.getSchedule(handle.id);
  assert.ok(infoAfter.runCount >= 1);
  assert.ok(typeof infoAfter.lastRun === 'number');
  adapter.destroy();
});

test('IntervalAdapter listSchedules returns all', () => {
  const adapter = createIntervalAdapter();
  const h1 = adapter.schedule(() => {}, { interval: 100 });
  const h2 = adapter.schedule(() => {}, { interval: 100 });

  const list = adapter.listSchedules();
  assert.equal(list.length, 2);

  const ids = list.map((s) => s.id);
  assert.ok(ids.includes(h1.id));
  assert.ok(ids.includes(h2.id));
  adapter.destroy();
});

test('IntervalAdapter destroy cancels all schedules', { timeout: 5000 }, async () => {
  const adapter = createIntervalAdapter();
  let count = 0;
  adapter.schedule(
    () => {
      count++;
    },
    { interval: 15 },
  );
  adapter.schedule(
    () => {
      count++;
    },
    { interval: 15 },
  );

  await wait(50);
  const countAtDestroy = count;
  adapter.destroy();
  await wait(50);

  assert.equal(count, countAtDestroy, 'no further runs after destroy');
});

test('IntervalAdapter getSchedule returns undefined for unknown id', () => {
  const adapter = createIntervalAdapter();
  assert.equal(adapter.getSchedule('nonexistent'), undefined);
  adapter.destroy();
});

test('IntervalAdapter schedule has nextRun when active', () => {
  const adapter = createIntervalAdapter();
  const handle = adapter.schedule(() => {}, { interval: 100 });
  const info = adapter.getSchedule(handle.id);
  assert.equal(info.status, 'active');
  assert.ok(typeof info.nextRun === 'number');
  adapter.destroy();
});

// ===========================================================================
// IdleAdapter
// ===========================================================================

test('IdleAdapter factory exists and returns an object', () => {
  const adapter = createIdleAdapter();
  assert.ok(adapter !== null && adapter !== undefined && typeof adapter === 'object');
  adapter.destroy();
});

test('IdleAdapter passes assertSchedulerPort', () => {
  const adapter = createIdleAdapter();
  assert.doesNotThrow(() => assertSchedulerPort(adapter));
  adapter.destroy();
});

test(
  'IdleAdapter falls back to setTimeout in Node.js (no requestIdleCallback)',
  { timeout: 5000 },
  async () => {
    const adapter = createIdleAdapter();
    let count = 0;
    adapter.schedule(
      () => {
        count++;
      },
      { interval: 20 },
    );

    await wait(500);
    adapter.destroy();

    // Should still run using setTimeout fallback
    assert.ok(count >= 1, `expected at least 1 run in fallback mode, got ${count}`);
  },
);

// ===========================================================================
// VisibilityAwareAdapter
// ===========================================================================

test('VisibilityAwareAdapter factory exists and returns an object', () => {
  const adapter = createVisibilityAwareAdapter();
  assert.ok(adapter !== null && adapter !== undefined && typeof adapter === 'object');
  adapter.destroy();
});

test('VisibilityAwareAdapter passes assertSchedulerPort', () => {
  const adapter = createVisibilityAwareAdapter();
  assert.doesNotThrow(() => assertSchedulerPort(adapter));
  adapter.destroy();
});

test('VisibilityAwareAdapter falls back to always-visible in Node.js', () => {
  const adapter = createVisibilityAwareAdapter();
  assert.equal(adapter.isVisible(), true);
  adapter.destroy();
});

test('VisibilityAwareAdapter wraps an inner adapter', { timeout: 5000 }, async () => {
  const inner = createIntervalAdapter();
  const adapter = createVisibilityAwareAdapter(inner);

  let count = 0;
  adapter.schedule(
    () => {
      count++;
    },
    { interval: 20 },
  );

  await wait(80);
  adapter.destroy();

  // In Node.js env (always visible), the inner adapter should run normally
  assert.ok(count >= 1, `expected runs through inner adapter, got ${count}`);
});

test('VisibilityAwareAdapter listSchedules delegates to inner', () => {
  const adapter = createVisibilityAwareAdapter();
  adapter.schedule(() => {}, { interval: 100 });
  adapter.schedule(() => {}, { interval: 100 });

  const list = adapter.listSchedules();
  assert.equal(list.length, 2);
  adapter.destroy();
});

test('VisibilityAwareAdapter cancel removes from managed set', () => {
  const adapter = createVisibilityAwareAdapter();
  const handle = adapter.schedule(() => {}, { interval: 100 });
  handle.cancel();

  const info = adapter.getSchedule(handle.id);
  assert.equal(info.status, 'cancelled');
  adapter.destroy();
});
