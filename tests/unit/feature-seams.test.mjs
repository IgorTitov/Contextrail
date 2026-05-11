/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit-test the foundational behavior of the feature-seams module — port assertion, SEAM_STATES, memory + config adapters, whenEnabled / ifEnabled guards, and onTransition / cleanupBy registry mechanics.
 * @sidecar feature-seams.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the feature-seams module — foundational layer.
 * Shadow-mode behavior, divergence tracking, auto-disable, and the
 * health adapter live in feature-seams-shadow.test.mjs.
 *
 * SpecRefs: TPL-037; TPL-038; TPL-039; TPL-040; TPL-218
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSeamPort,
  createMemorySeamAdapter,
  createConfigSeamAdapter,
  whenEnabled,
  ifEnabled,
  SEAM_STATES,
} from '../../modules/feature-seams/public-api.mjs';

/* ── SeamPort contract assertion (TPL-040) ── */

describe('feature-seams port — assertSeamPort()', () => {
  test('accepts a conforming adapter', () => {
    const adapter = createMemorySeamAdapter();
    assert.doesNotThrow(() => assertSeamPort(adapter));
  });

  test('throws for null', () => {
    assert.throws(() => assertSeamPort(null), TypeError);
  });

  test('throws for missing register()', () => {
    assert.throws(
      () =>
        assertSeamPort({
          isEnabled: () => false,
          enable: () => {},
          disable: () => {},
          list: () => [],
          remove: () => {},
        }),
      TypeError,
    );
  });

  test('throws for missing isEnabled()', () => {
    assert.throws(
      () =>
        assertSeamPort({
          register: () => {},
          enable: () => {},
          disable: () => {},
          list: () => [],
          remove: () => {},
        }),
      TypeError,
    );
  });
});

/* ── SEAM_STATES constants ── */

describe('feature-seams — SEAM_STATES', () => {
  test('has active, shadow, and disabled', () => {
    assert.equal(SEAM_STATES.ACTIVE, 'active');
    assert.equal(SEAM_STATES.SHADOW, 'shadow');
    assert.equal(SEAM_STATES.DISABLED, 'disabled');
  });
});

/* ── Memory adapter (TPL-038) ── */

describe('feature-seams adapter — memorySeamAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = createMemorySeamAdapter();
  });

  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertSeamPort(adapter));
  });

  test('isEnabled returns false for unknown flag', () => {
    assert.equal(adapter.isEnabled('unknown-flag'), false);
  });

  test('register + isEnabled (active)', () => {
    adapter.register('feat-a', { state: 'active', owner: 'test' });
    assert.equal(adapter.isEnabled('feat-a'), true);
  });

  test('register + isEnabled (disabled)', () => {
    adapter.register('feat-b', { state: 'disabled', owner: 'test' });
    assert.equal(adapter.isEnabled('feat-b'), false);
  });

  test('register + isEnabled (shadow)', () => {
    adapter.register('feat-c', { state: 'shadow', owner: 'test' });
    assert.equal(adapter.isEnabled('feat-c'), false);
  });

  test('enable() switches state to active', () => {
    adapter.register('feat-d', { state: 'disabled', owner: 'test' });
    adapter.enable('feat-d');
    assert.equal(adapter.isEnabled('feat-d'), true);
  });

  test('disable() switches state to disabled', () => {
    adapter.register('feat-e', { state: 'active', owner: 'test' });
    adapter.disable('feat-e');
    assert.equal(adapter.isEnabled('feat-e'), false);
  });

  test('list() returns all registered seams', () => {
    adapter.register('feat-f', { state: 'active', owner: 'alice' });
    adapter.register('feat-g', { state: 'disabled', owner: 'bob' });
    const seams = adapter.list();
    assert.equal(seams.length, 2);
    assert.ok(seams.find((s) => s.flag === 'feat-f' && s.state === 'active'));
    assert.ok(seams.find((s) => s.flag === 'feat-g' && s.state === 'disabled'));
  });

  test('remove() deletes a seam', () => {
    adapter.register('feat-h', { state: 'active', owner: 'test' });
    adapter.remove('feat-h');
    assert.equal(adapter.isEnabled('feat-h'), false);
    assert.equal(adapter.list().length, 0);
  });

  test('register throws on duplicate flag', () => {
    adapter.register('feat-dup', { state: 'active', owner: 'test' });
    assert.throws(
      () => adapter.register('feat-dup', { state: 'disabled', owner: 'test' }),
      /already registered/,
    );
  });

  test('enable throws for unknown flag', () => {
    assert.throws(() => adapter.enable('nonexistent'), /not registered/);
  });

  test('disable throws for unknown flag', () => {
    assert.throws(() => adapter.disable('nonexistent'), /not registered/);
  });

  test('remove is silent for unknown flag', () => {
    assert.doesNotThrow(() => adapter.remove('nonexistent'));
  });

  test('list returns copies (no shared references)', () => {
    adapter.register('feat-copy', { state: 'active', owner: 'test', description: 'desc' });
    const list1 = adapter.list();
    list1[0].state = 'hacked';
    const list2 = adapter.list();
    assert.equal(list2[0].state, 'active');
  });
});

/* ── Config adapter (TPL-039) ── */

describe('feature-seams adapter — configSeamAdapter', () => {
  test('satisfies the port contract', () => {
    const adapter = createConfigSeamAdapter({});
    assert.doesNotThrow(() => assertSeamPort(adapter));
  });

  test('reads initial flags from config object', () => {
    const adapter = createConfigSeamAdapter({
      'dark-mode-v2': { state: 'active', owner: 'ui-team' },
      'new-auth': { state: 'disabled', owner: 'auth-team' },
    });
    assert.equal(adapter.isEnabled('dark-mode-v2'), true);
    assert.equal(adapter.isEnabled('new-auth'), false);
  });

  test('list() returns config-defined seams', () => {
    const adapter = createConfigSeamAdapter({
      'feat-x': { state: 'shadow', owner: 'test' },
    });
    const seams = adapter.list();
    assert.equal(seams.length, 1);
    assert.equal(seams[0].flag, 'feat-x');
    assert.equal(seams[0].state, 'shadow');
  });

  test('supports runtime register/enable/disable on top of config', () => {
    const adapter = createConfigSeamAdapter({
      'feat-y': { state: 'disabled', owner: 'test' },
    });
    adapter.enable('feat-y');
    assert.equal(adapter.isEnabled('feat-y'), true);
    adapter.register('feat-z', { state: 'active', owner: 'test' });
    assert.equal(adapter.isEnabled('feat-z'), true);
  });

  test('does not mutate the original config object', () => {
    const config = { 'feat-frozen': { state: 'disabled', owner: 'test' } };
    const adapter = createConfigSeamAdapter(config);
    adapter.enable('feat-frozen');
    assert.equal(config['feat-frozen'].state, 'disabled');
  });
});

/* ── Guard helpers (TPL-040) ── */

describe('feature-seams guards — whenEnabled()', () => {
  let adapter;

  beforeEach(() => {
    adapter = createMemorySeamAdapter();
  });

  test('returns new-path result when flag is active', () => {
    adapter.register('feat-new', { state: 'active', owner: 'test' });
    const result = whenEnabled(
      adapter,
      'feat-new',
      () => 'NEW',
      () => 'OLD',
    );
    assert.equal(result, 'NEW');
  });

  test('returns old-path result when flag is disabled', () => {
    adapter.register('feat-old', { state: 'disabled', owner: 'test' });
    const result = whenEnabled(
      adapter,
      'feat-old',
      () => 'NEW',
      () => 'OLD',
    );
    assert.equal(result, 'OLD');
  });

  test('returns old-path result when flag is unknown', () => {
    const result = whenEnabled(
      adapter,
      'unknown',
      () => 'NEW',
      () => 'OLD',
    );
    assert.equal(result, 'OLD');
  });

  test('returns old-path result when flag is shadow', () => {
    adapter.register('feat-shadow', { state: 'shadow', owner: 'test' });
    const result = whenEnabled(
      adapter,
      'feat-shadow',
      () => 'NEW',
      () => 'OLD',
    );
    assert.equal(result, 'OLD');
  });
});

describe('feature-seams guards — ifEnabled()', () => {
  let adapter;

  beforeEach(() => {
    adapter = createMemorySeamAdapter();
  });

  test('calls action when flag is active', () => {
    adapter.register('feat-if', { state: 'active', owner: 'test' });
    let called = false;
    ifEnabled(adapter, 'feat-if', () => {
      called = true;
    });
    assert.ok(called);
  });

  test('does not call action when flag is disabled', () => {
    adapter.register('feat-if2', { state: 'disabled', owner: 'test' });
    let called = false;
    ifEnabled(adapter, 'feat-if2', () => {
      called = true;
    });
    assert.ok(!called);
  });

  test('does not call action when flag is unknown', () => {
    let called = false;
    ifEnabled(adapter, 'unknown', () => {
      called = true;
    });
    assert.ok(!called);
  });
});

/* ── onTransition callback (S6) ── */

describe('feature-seams registry — onTransition()', () => {
  test('fires on register', () => {
    const events = [];
    const adapter = createMemorySeamAdapter({ onTransition: (e) => events.push(e) });
    adapter.register('x', { state: 'disabled', owner: 'test' });
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'register');
    assert.equal(events[0].flag, 'x');
    assert.equal(events[0].newState, 'disabled');
    assert.ok(events[0].timestamp);
  });

  test('fires on enable with previousState', () => {
    const events = [];
    const adapter = createMemorySeamAdapter({ onTransition: (e) => events.push(e) });
    adapter.register('x', { state: 'disabled', owner: 'test' });
    adapter.enable('x');
    assert.equal(events.length, 2);
    assert.equal(events[1].type, 'enable');
    assert.equal(events[1].previousState, 'disabled');
    assert.equal(events[1].newState, 'active');
  });

  test('fires on disable with previousState', () => {
    const events = [];
    const adapter = createMemorySeamAdapter({ onTransition: (e) => events.push(e) });
    adapter.register('x', { state: 'active', owner: 'test' });
    adapter.disable('x');
    assert.equal(events[1].type, 'disable');
    assert.equal(events[1].previousState, 'active');
    assert.equal(events[1].newState, 'disabled');
  });

  test('fires on remove', () => {
    const events = [];
    const adapter = createMemorySeamAdapter({ onTransition: (e) => events.push(e) });
    adapter.register('x', { state: 'active', owner: 'test' });
    adapter.remove('x');
    assert.equal(events[1].type, 'remove');
    assert.equal(events[1].previousState, 'active');
  });

  test('does not fire on remove of unknown flag', () => {
    const events = [];
    const adapter = createMemorySeamAdapter({ onTransition: (e) => events.push(e) });
    adapter.remove('unknown');
    assert.equal(events.length, 0);
  });
});

/* ── cleanupBy and timestamps (S6) ── */

describe('feature-seams registry — cleanupBy and timestamps', () => {
  test('stores cleanupBy from config', () => {
    const adapter = createMemorySeamAdapter();
    adapter.register('x', { state: 'disabled', owner: 'test', cleanupBy: '2026-05-01' });
    const entry = adapter.list().find((s) => s.flag === 'x');
    assert.equal(entry.cleanupBy, '2026-05-01');
  });

  test('enabledAt is set on register when state is active', () => {
    const adapter = createMemorySeamAdapter();
    adapter.register('x', { state: 'active', owner: 'test' });
    const entry = adapter.list().find((s) => s.flag === 'x');
    assert.ok(entry.enabledAt);
  });

  test('enabledAt is updated on enable()', () => {
    const adapter = createMemorySeamAdapter();
    adapter.register('x', { state: 'disabled', owner: 'test' });
    const before = adapter.list().find((s) => s.flag === 'x');
    assert.equal(before.enabledAt, undefined);
    adapter.enable('x');
    const after = adapter.list().find((s) => s.flag === 'x');
    assert.ok(after.enabledAt);
  });

  test('disabledAt is updated on disable()', () => {
    const adapter = createMemorySeamAdapter();
    adapter.register('x', { state: 'active', owner: 'test' });
    adapter.disable('x');
    const entry = adapter.list().find((s) => s.flag === 'x');
    assert.ok(entry.disabledAt);
  });
});
