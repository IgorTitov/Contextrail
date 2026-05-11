/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of notifications-test in this repository.
 * @sidecar notifications.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createNotification,
  shouldAutoDismiss,
  resetIdCounter,
  assertNotificationPort,
  createMemoryNotificationAdapter,
} from '../../modules/notifications/public-api.mjs';

beforeEach(() => resetIdCounter());

describe('notifications domain — createNotification()', () => {
  test('creates an info notification by default', () => {
    const n = createNotification('Hello');
    assert.equal(n.message, 'Hello');
    assert.equal(n.level, 'info');
    assert.equal(n.autoDismiss, true);
    assert.equal(n.duration, 5000);
    assert.ok(n.id.startsWith('notif-'));
    assert.equal(typeof n.timestamp, 'number');
  });

  test('creates a success notification', () => {
    const n = createNotification('Saved', 'success');
    assert.equal(n.level, 'success');
    assert.equal(n.duration, 5000);
    assert.equal(n.autoDismiss, true);
  });

  test('creates an error notification without auto-dismiss', () => {
    const n = createNotification('Failed', 'error');
    assert.equal(n.level, 'error');
    assert.equal(n.duration, 0);
    assert.equal(n.autoDismiss, false);
  });

  test('allows custom duration', () => {
    const n = createNotification('Custom', 'info', { duration: 10000 });
    assert.equal(n.duration, 10000);
  });

  test('generates unique IDs', () => {
    const a = createNotification('A');
    const b = createNotification('B');
    assert.notEqual(a.id, b.id);
  });
});

describe('notifications domain — shouldAutoDismiss()', () => {
  test('returns true for auto-dismiss notification with positive duration', () => {
    const n = createNotification('Test', 'info');
    assert.ok(shouldAutoDismiss(n));
  });

  test('returns false for error notification', () => {
    const n = createNotification('Error', 'error');
    assert.ok(!shouldAutoDismiss(n));
  });

  test('returns false when autoDismiss is explicitly false', () => {
    const n = createNotification('Test', 'info', { autoDismiss: false });
    assert.ok(!shouldAutoDismiss(n));
  });
});

describe('notifications port — assertNotificationPort()', () => {
  test('accepts a valid adapter', () => {
    const adapter = { show: () => {}, dismiss: () => {}, getActive: () => [] };
    assert.doesNotThrow(() => assertNotificationPort(adapter));
  });

  test('throws for null', () => {
    assert.throws(() => assertNotificationPort(null), TypeError);
  });

  test('throws for missing show', () => {
    assert.throws(
      () => assertNotificationPort({ dismiss: () => {}, getActive: () => [] }),
      TypeError,
    );
  });

  test('throws for missing dismiss', () => {
    assert.throws(() => assertNotificationPort({ show: () => {}, getActive: () => [] }), TypeError);
  });

  test('throws for missing getActive', () => {
    assert.throws(() => assertNotificationPort({ show: () => {}, dismiss: () => {} }), TypeError);
  });
});

describe('notifications adapter — memoryNotificationAdapter', () => {
  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertNotificationPort(createMemoryNotificationAdapter()));
  });

  test('starts with empty active list', () => {
    const adapter = createMemoryNotificationAdapter();
    assert.deepEqual(adapter.getActive(), []);
  });

  test('show adds a notification', () => {
    const adapter = createMemoryNotificationAdapter();
    const n = createNotification('Test');
    adapter.show(n);
    assert.equal(adapter.getActive().length, 1);
    assert.equal(adapter.getActive()[0].message, 'Test');
  });

  test('dismiss removes a notification', () => {
    const adapter = createMemoryNotificationAdapter();
    const n = createNotification('Test');
    adapter.show(n);
    adapter.dismiss(n.id);
    assert.deepEqual(adapter.getActive(), []);
  });

  test('dismiss is a no-op for unknown id', () => {
    const adapter = createMemoryNotificationAdapter();
    assert.doesNotThrow(() => adapter.dismiss('nonexistent'));
  });

  test('show creates a copy (no shared reference)', () => {
    const adapter = createMemoryNotificationAdapter();
    const n = createNotification('Test');
    adapter.show(n);
    n.message = 'Changed';
    assert.equal(adapter.getActive()[0].message, 'Test');
  });
});
