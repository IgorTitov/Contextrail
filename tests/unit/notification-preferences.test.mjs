/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for notification preferences, history, and routing.
 * @sidecar notification-preferences.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx notifications
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultPreferences,
  setChannelPreference,
  setMuted,
  resolveChannel,
  muteAll,
  unmuteAll,
  createHistoryItem,
  markRead,
  markArchived,
  countUnread,
  filterByStatus,
  filterByEventType,
  routeNotification,
} from '../../modules/notifications/public-api.mjs';

const EVENT_TYPES = ['task-assigned', 'comment-reply', 'system-alert'];

/* ── Preferences ── */

describe('notification preferences', () => {
  test('creates defaults for all event types', () => {
    const prefs = createDefaultPreferences(EVENT_TYPES);
    assert.equal(Object.keys(prefs).length, 3);
    assert.equal(prefs['task-assigned'].channel, 'in-app');
    assert.equal(prefs['task-assigned'].muted, false);
  });

  test('creates defaults with custom channel', () => {
    const prefs = createDefaultPreferences(EVENT_TYPES, 'email');
    assert.equal(prefs['task-assigned'].channel, 'email');
  });

  test('setChannelPreference updates one type', () => {
    let prefs = createDefaultPreferences(EVENT_TYPES);
    prefs = setChannelPreference(prefs, 'task-assigned', 'push');
    assert.equal(prefs['task-assigned'].channel, 'push');
    assert.equal(prefs['comment-reply'].channel, 'in-app');
  });

  test('setMuted mutes a type', () => {
    let prefs = createDefaultPreferences(EVENT_TYPES);
    prefs = setMuted(prefs, 'system-alert', true);
    assert.equal(prefs['system-alert'].muted, true);
  });

  test('resolveChannel returns none when muted', () => {
    let prefs = createDefaultPreferences(EVENT_TYPES);
    prefs = setMuted(prefs, 'task-assigned', true);
    assert.equal(resolveChannel(prefs, 'task-assigned'), 'none');
  });

  test('resolveChannel returns default for unknown type', () => {
    const prefs = createDefaultPreferences(EVENT_TYPES);
    assert.equal(resolveChannel(prefs, 'unknown-event'), 'in-app');
  });

  test('muteAll / unmuteAll', () => {
    let prefs = createDefaultPreferences(EVENT_TYPES);
    prefs = muteAll(prefs);
    assert.equal(resolveChannel(prefs, 'task-assigned'), 'none');
    assert.equal(resolveChannel(prefs, 'comment-reply'), 'none');
    prefs = unmuteAll(prefs);
    assert.equal(resolveChannel(prefs, 'task-assigned'), 'in-app');
  });
});

/* ── History ── */

describe('notification history', () => {
  test('creates unread item', () => {
    const item = createHistoryItem('task-assigned', 'You have a new task');
    assert.equal(item.status, 'unread');
    assert.equal(item.eventType, 'task-assigned');
    assert.ok(item.id.startsWith('hist_'));
  });

  test('markRead transitions unread → read', () => {
    const item = createHistoryItem('task-assigned', 'msg');
    const read = markRead(item);
    assert.equal(read.status, 'read');
    assert.ok(read.readAt);
  });

  test('markRead is no-op on already read', () => {
    const item = createHistoryItem('task-assigned', 'msg');
    const read = markRead(item);
    const readAgain = markRead(read);
    assert.equal(readAgain.readAt, read.readAt);
  });

  test('markArchived works from any state', () => {
    const item = createHistoryItem('task-assigned', 'msg');
    const archived = markArchived(item);
    assert.equal(archived.status, 'archived');
  });

  test('countUnread counts correctly', () => {
    const items = [
      createHistoryItem('a', 'msg1'),
      markRead(createHistoryItem('b', 'msg2')),
      createHistoryItem('c', 'msg3'),
    ];
    assert.equal(countUnread(items), 2);
  });

  test('filterByStatus', () => {
    const items = [createHistoryItem('a', 'msg1'), markRead(createHistoryItem('b', 'msg2'))];
    assert.equal(filterByStatus(items, 'unread').length, 1);
    assert.equal(filterByStatus(items, 'read').length, 1);
  });

  test('filterByEventType', () => {
    const items = [
      createHistoryItem('task-assigned', 'msg1'),
      createHistoryItem('comment-reply', 'msg2'),
      createHistoryItem('task-assigned', 'msg3'),
    ];
    assert.equal(filterByEventType(items, 'task-assigned').length, 2);
  });
});

/* ── Router ── */

describe('notification router', () => {
  test('routes to in-app adapter', async () => {
    const shown = [];
    const adapters = {
      inApp: { show: (n) => shown.push(n), dismiss: () => {}, getActive: () => [] },
    };
    const prefs = createDefaultPreferences(['task-assigned']);

    const result = await routeNotification(
      { eventType: 'task-assigned', message: 'New task' },
      prefs,
      adapters,
    );

    assert.equal(result.channel, 'in-app');
    assert.equal(result.delivered, true);
    assert.equal(shown.length, 1);
    assert.ok(result.historyItem.id.startsWith('hist_'));
  });

  test('routes to email adapter', async () => {
    const sent = [];
    const adapters = {
      email: { send: async (to, subj, body) => sent.push({ to, subj, body }) },
    };
    let prefs = createDefaultPreferences(['task-assigned']);
    prefs = setChannelPreference(prefs, 'task-assigned', 'email');

    const result = await routeNotification(
      { eventType: 'task-assigned', message: 'New task', userEmail: 'alice@example.com' },
      prefs,
      adapters,
    );

    assert.equal(result.channel, 'email');
    assert.equal(result.delivered, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'alice@example.com');
  });

  test('returns delivered=true for muted (intentional no-op)', async () => {
    let prefs = createDefaultPreferences(['task-assigned']);
    prefs = setMuted(prefs, 'task-assigned', true);

    const result = await routeNotification(
      { eventType: 'task-assigned', message: 'Muted' },
      prefs,
      {},
    );

    assert.equal(result.channel, 'none');
    assert.equal(result.delivered, true);
  });

  test('returns delivered=false when adapter missing', async () => {
    const prefs = createDefaultPreferences(['task-assigned']);

    const result = await routeNotification(
      { eventType: 'task-assigned', message: 'No adapter' },
      prefs,
      {}, // no inApp adapter
    );

    assert.equal(result.channel, 'in-app');
    assert.equal(result.delivered, false);
  });
});
