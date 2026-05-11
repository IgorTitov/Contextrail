/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Notification router — given event type + user preferences, route to the correct channel adapter.
 * @sidecar router.mjs.header.md
 * @layer module | @hex domain | @ctx notifications
 * @public false
 * @edit careful
 */

import { resolveChannel } from './preferences.mjs';
import { createNotification } from './notification.mjs';
import { createHistoryItem } from './history.mjs';

/**
 * @typedef {Object} ChannelAdapters
 * @property {import('../ports/notification-port.mjs').NotificationPort} [inApp]
 * @property {{ send: (to: string, subject: string, body: string) => Promise<void> }} [email]
 * @property {{ send: (userId: string, payload: object) => Promise<void> }} [push]
 */

/**
 * @typedef {Object} RouteResult
 * @property {import('./preferences.mjs').NotificationChannel} channel
 * @property {boolean} delivered
 * @property {import('./history.mjs').HistoryItem} historyItem
 */

/**
 * Route a notification to the correct channel based on user preferences.
 *
 * @param {Object} params
 * @param {string} params.eventType - e.g., 'task-assigned'
 * @param {string} params.message
 * @param {import('./notification.mjs').NotificationLevel} [params.level]
 * @param {string} [params.userId] - for email/push routing
 * @param {string} [params.userEmail] - for email channel
 * @param {Record<string, string>} [params.metadata]
 * @param {import('./preferences.mjs').NotificationPreferences} preferences
 * @param {ChannelAdapters} adapters
 * @returns {Promise<RouteResult>}
 */
export async function routeNotification(params, preferences, adapters) {
  const { eventType, message, level = 'info', userId, userEmail, metadata } = params;
  const channel = resolveChannel(preferences, eventType);
  const historyItem = createHistoryItem(eventType, message, level, metadata);

  let delivered = false;

  switch (channel) {
    case 'in-app':
      if (adapters.inApp) {
        adapters.inApp.show(createNotification(message, level));
        delivered = true;
      }
      break;
    case 'email':
      if (adapters.email && userEmail) {
        await adapters.email.send(userEmail, eventType, message);
        delivered = true;
      }
      break;
    case 'push':
      if (adapters.push && userId) {
        await adapters.push.send(userId, { eventType, message, level });
        delivered = true;
      }
      break;
    case 'none':
      delivered = true; // intentionally not delivered
      break;
  }

  return { channel, delivered, historyItem };
}
