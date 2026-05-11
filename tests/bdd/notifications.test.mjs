/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of notifications-test in this repository.
 * @sidecar notifications.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for notifications.feature.
 * Proves user-visible notification behavior through the notifications module public API.
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createNotification,
  shouldAutoDismiss,
  resetIdCounter,
  assertNotificationPort,
  createMemoryNotificationAdapter,
} from '../../modules/notifications/public-api.mjs';

const feature = readFileSync(new URL('./features/notifications.feature', import.meta.url), 'utf8');

describe('Feature: Toast notifications', () => {
  /** @type {ReturnType<typeof createMemoryNotificationAdapter>} */
  let adapter;

  beforeEach(() => {
    resetIdCounter();
    adapter = createMemoryNotificationAdapter();
    assertNotificationPort(adapter);
  });

  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Toast notifications'));
    assert.ok(feature.includes('Scenario: Show an info notification'));
    assert.ok(feature.includes('Scenario: Show a success notification'));
    assert.ok(feature.includes('Scenario: Show an error notification'));
    assert.ok(feature.includes('Scenario: Dismiss a notification'));
    assert.ok(feature.includes('Scenario: Multiple notifications stack'));
  });

  test('Scenario: Show an info notification', () => {
    // When the system shows an info notification with message "File saved"
    const notif = createNotification('File saved', 'info');
    adapter.show(notif);

    // Then the user sees one active notification
    const active = adapter.getActive();
    assert.equal(active.length, 1);

    // And the notification message is "File saved"
    assert.equal(active[0].message, 'File saved');

    // And the notification level is "info"
    assert.equal(active[0].level, 'info');
  });

  test('Scenario: Show a success notification', () => {
    // When the system shows a success notification with message "Upload complete"
    const notif = createNotification('Upload complete', 'success');
    adapter.show(notif);

    // Then the user sees one active notification
    assert.equal(adapter.getActive().length, 1);

    // And the notification level is "success"
    assert.equal(adapter.getActive()[0].level, 'success');
  });

  test('Scenario: Show an error notification', () => {
    // When the system shows an error notification with message "Connection lost"
    const notif = createNotification('Connection lost', 'error');
    adapter.show(notif);

    // Then the notification does not auto-dismiss
    assert.equal(shouldAutoDismiss(notif), false);
  });

  test('Scenario: Dismiss a notification', () => {
    // Given the user sees a notification with message "Temporary"
    const notif = createNotification('Temporary', 'info');
    adapter.show(notif);
    assert.equal(adapter.getActive().length, 1);

    // When the user dismisses the notification
    adapter.dismiss(notif.id);

    // Then the user sees no active notifications
    assert.equal(adapter.getActive().length, 0);
  });

  test('Scenario: Multiple notifications stack', () => {
    // When the system shows an info notification with message "First"
    adapter.show(createNotification('First', 'info'));

    // And the system shows an error notification with message "Second"
    adapter.show(createNotification('Second', 'error'));

    // Then the user sees 2 active notifications
    assert.equal(adapter.getActive().length, 2);
  });
});
