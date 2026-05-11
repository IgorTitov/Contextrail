/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the feature-seams shadow-mode behavior — isShadow predicate, whenShadow guard semantics, divergence tracker, auto-disable, and the health-port adapter.
 * @sidecar feature-seams-shadow.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the feature-seams module — shadow + health layer.
 * Foundational adapter, port-assertion, and guard tests live in
 * feature-seams.test.mjs.
 *
 * SpecRefs: TPL-218
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertHealthPort,
  createMemorySeamAdapter,
  createHealthAdapter,
  whenShadow,
  createDivergenceTracker,
} from '../../modules/feature-seams/public-api.mjs';

/* ── isShadow (S1) ── */

describe('feature-seams registry — isShadow()', () => {
  let adapter;

  beforeEach(() => {
    adapter = createMemorySeamAdapter();
  });

  test('returns true for shadow flag', () => {
    adapter.register('feat-s', { state: 'shadow', owner: 'test' });
    assert.equal(adapter.isShadow('feat-s'), true);
  });

  test('returns false for active flag', () => {
    adapter.register('feat-a', { state: 'active', owner: 'test' });
    assert.equal(adapter.isShadow('feat-a'), false);
  });

  test('returns false for disabled flag', () => {
    adapter.register('feat-d', { state: 'disabled', owner: 'test' });
    assert.equal(adapter.isShadow('feat-d'), false);
  });

  test('returns false for unknown flag', () => {
    assert.equal(adapter.isShadow('unknown'), false);
  });
});

/* ── whenShadow guard (S1) ── */

describe('feature-seams guards — whenShadow()', () => {
  let adapter;

  beforeEach(() => {
    adapter = createMemorySeamAdapter();
  });

  test('runs both paths in shadow mode and returns old result', () => {
    adapter.register('feat', { state: 'shadow', owner: 'test' });
    let newRan = false;
    let oldRan = false;
    const result = whenShadow(
      adapter,
      'feat',
      () => {
        newRan = true;
        return 'NEW';
      },
      () => {
        oldRan = true;
        return 'OLD';
      },
    );
    assert.equal(result, 'OLD');
    assert.ok(oldRan, 'old path must run');
    assert.ok(newRan, 'new path must run in shadow');
  });

  test('calls onDivergence when results differ', () => {
    adapter.register('feat', { state: 'shadow', owner: 'test' });
    let diverged = false;
    whenShadow(
      adapter,
      'feat',
      () => 'NEW',
      () => 'OLD',
      {
        onDivergence: () => {
          diverged = true;
        },
      },
    );
    assert.ok(diverged);
  });

  test('does not call onDivergence when results match', () => {
    adapter.register('feat', { state: 'shadow', owner: 'test' });
    let diverged = false;
    whenShadow(
      adapter,
      'feat',
      () => 'SAME',
      () => 'SAME',
      {
        onDivergence: () => {
          diverged = true;
        },
      },
    );
    assert.ok(!diverged);
  });

  test('supports custom compare function', () => {
    adapter.register('feat', { state: 'shadow', owner: 'test' });
    let diverged = false;
    whenShadow(
      adapter,
      'feat',
      () => ({ v: 1 }),
      () => ({ v: 1 }),
      {
        compare: (a, b) => a.v === b.v,
        onDivergence: () => {
          diverged = true;
        },
      },
    );
    assert.ok(!diverged);
  });

  test('catches new-path exception and calls onError', () => {
    adapter.register('feat', { state: 'shadow', owner: 'test' });
    let caughtError = null;
    const result = whenShadow(
      adapter,
      'feat',
      () => {
        throw new Error('boom');
      },
      () => 'OLD',
      {
        onError: (_flag, err) => {
          caughtError = err;
        },
      },
    );
    assert.equal(result, 'OLD');
    assert.ok(caughtError instanceof Error);
    assert.equal(caughtError.message, 'boom');
  });

  test('new-path exception does not crash without onError', () => {
    adapter.register('feat', { state: 'shadow', owner: 'test' });
    const result = whenShadow(
      adapter,
      'feat',
      () => {
        throw new Error('boom');
      },
      () => 'OLD',
    );
    assert.equal(result, 'OLD');
  });

  test('falls back to new-path when flag is active', () => {
    adapter.register('feat', { state: 'active', owner: 'test' });
    const result = whenShadow(
      adapter,
      'feat',
      () => 'NEW',
      () => 'OLD',
    );
    assert.equal(result, 'NEW');
  });

  test('falls back to old-path when flag is disabled', () => {
    adapter.register('feat', { state: 'disabled', owner: 'test' });
    const result = whenShadow(
      adapter,
      'feat',
      () => 'NEW',
      () => 'OLD',
    );
    assert.equal(result, 'OLD');
  });

  test('falls back to old-path when flag is unknown', () => {
    const result = whenShadow(
      adapter,
      'unknown',
      () => 'NEW',
      () => 'OLD',
    );
    assert.equal(result, 'OLD');
  });
});

/* ── Divergence tracker (S7) ── */

describe('feature-seams — createDivergenceTracker()', () => {
  test('does not breach below threshold', () => {
    const tracker = createDivergenceTracker({ maxDivergence: 3, windowSize: 5 });
    assert.equal(tracker.record(true), false);
    assert.equal(tracker.record(true), false);
    assert.equal(tracker.record(false), false);
  });

  test('breaches at threshold', () => {
    const tracker = createDivergenceTracker({ maxDivergence: 3, windowSize: 5 });
    tracker.record(true);
    tracker.record(true);
    assert.equal(tracker.record(true), true);
  });

  test('window slides — old divergences fall off', () => {
    const tracker = createDivergenceTracker({ maxDivergence: 3, windowSize: 4 });
    tracker.record(true);
    tracker.record(true);
    tracker.record(false);
    tracker.record(false);
    assert.equal(tracker.record(false), false);
  });

  test('defaults windowSize to 20', () => {
    const tracker = createDivergenceTracker({ maxDivergence: 1 });
    for (let i = 0; i < 19; i++) tracker.record(false);
    assert.equal(tracker.record(true), true);
  });
});

/* ── Auto-disable via tracker in whenShadow (S7) ── */

describe('feature-seams — whenShadow auto-disable', () => {
  test('auto-disables seam when tracker breaches threshold', () => {
    const adapter = createMemorySeamAdapter();
    adapter.register('feat', { state: 'shadow', owner: 'test' });
    const tracker = createDivergenceTracker({ maxDivergence: 2, windowSize: 5 });

    for (let i = 0; i < 3; i++) {
      whenShadow(
        adapter,
        'feat',
        () => 'NEW',
        () => 'OLD',
        { tracker },
      );
    }
    assert.equal(adapter.isShadow('feat'), false);
    assert.equal(adapter.isEnabled('feat'), false);
  });

  test('does not auto-disable when divergence is below threshold', () => {
    const adapter = createMemorySeamAdapter();
    adapter.register('feat', { state: 'shadow', owner: 'test' });
    const tracker = createDivergenceTracker({ maxDivergence: 5, windowSize: 10 });

    whenShadow(
      adapter,
      'feat',
      () => 'NEW',
      () => 'OLD',
      { tracker },
    );
    assert.equal(adapter.isShadow('feat'), true);
  });

  test('counts new-path exceptions as divergence', () => {
    const adapter = createMemorySeamAdapter();
    adapter.register('feat', { state: 'shadow', owner: 'test' });
    const tracker = createDivergenceTracker({ maxDivergence: 2, windowSize: 5 });

    whenShadow(
      adapter,
      'feat',
      () => {
        throw new Error('boom');
      },
      () => 'OLD',
      { tracker },
    );
    whenShadow(
      adapter,
      'feat',
      () => {
        throw new Error('boom');
      },
      () => 'OLD',
      { tracker },
    );
    assert.equal(adapter.isShadow('feat'), false);
  });
});

/* ── Health port (S8) ── */

describe('feature-seams — health adapter', () => {
  test('satisfies health port contract', () => {
    const seams = createMemorySeamAdapter();
    const health = createHealthAdapter(seams);
    assert.doesNotThrow(() => assertHealthPort(health));
  });

  test('healthy when no seams registered', () => {
    const seams = createMemorySeamAdapter();
    const health = createHealthAdapter(seams);
    const result = health.check();
    assert.equal(result.healthy, true);
    assert.equal(result.seams.length, 0);
  });

  test('healthy when seams have no overdue cleanup', () => {
    const seams = createMemorySeamAdapter();
    seams.register('x', { state: 'active', owner: 'test', cleanupBy: '2099-01-01' });
    const health = createHealthAdapter(seams);
    assert.equal(health.check().healthy, true);
  });

  test('unhealthy when cleanupBy date has passed', () => {
    const seams = createMemorySeamAdapter();
    seams.register('x', { state: 'active', owner: 'test', cleanupBy: '2020-01-01' });
    const health = createHealthAdapter(seams);
    assert.equal(health.check().healthy, false);
  });

  test('lists all seams with state and timestamps', () => {
    const seams = createMemorySeamAdapter();
    seams.register('a', { state: 'active', owner: 'test' });
    seams.register('b', { state: 'disabled', owner: 'test' });
    const health = createHealthAdapter(seams);
    const result = health.check();
    assert.equal(result.seams.length, 2);
    assert.ok(result.seams.find((s) => s.flag === 'a' && s.state === 'active'));
    assert.ok(result.seams.find((s) => s.flag === 'b' && s.state === 'disabled'));
  });
});
