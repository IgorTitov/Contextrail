/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure domain logic for notification history — persistent inbox with read/unread/archived states.
 * @sidecar history.mjs.header.md
 * @layer module | @hex domain | @ctx notifications
 * @public false
 * @edit careful
 */

/**
 * Notification history: persistent inbox of all notifications.
 * Pure domain logic — no storage, no framework.
 */

/**
 * @typedef {'unread' | 'read' | 'archived'} HistoryItemStatus
 */

/**
 * @typedef {Object} HistoryItem
 * @property {string} id
 * @property {string} eventType - e.g., 'task-assigned', 'comment-reply'
 * @property {string} message
 * @property {import('./notification.mjs').NotificationLevel} level
 * @property {HistoryItemStatus} status
 * @property {string} createdAt - ISO date
 * @property {string} [readAt] - ISO date
 * @property {Record<string, string>} [metadata] - arbitrary context (taskId, userId, etc.)
 */

/**
 * Create a history item from a notification event.
 * @param {string} eventType
 * @param {string} message
 * @param {import('./notification.mjs').NotificationLevel} [level]
 * @param {Record<string, string>} [metadata]
 * @returns {HistoryItem}
 */
export function createHistoryItem(eventType, message, level = 'info', metadata = {}) {
  return {
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    eventType,
    message,
    level,
    status: 'unread',
    createdAt: new Date().toISOString(),
    metadata,
  };
}

/**
 * Mark an item as read.
 * @param {HistoryItem} item
 * @returns {HistoryItem}
 */
export function markRead(item) {
  if (item.status === 'read' || item.status === 'archived') return item;
  return { ...item, status: 'read', readAt: new Date().toISOString() };
}

/**
 * Mark an item as archived.
 * @param {HistoryItem} item
 * @returns {HistoryItem}
 */
export function markArchived(item) {
  return { ...item, status: 'archived' };
}

/**
 * Count unread items.
 * @param {HistoryItem[]} items
 * @returns {number}
 */
export function countUnread(items) {
  return items.filter((i) => i.status === 'unread').length;
}

/**
 * Filter items by status.
 * @param {HistoryItem[]} items
 * @param {HistoryItemStatus} status
 * @returns {HistoryItem[]}
 */
export function filterByStatus(items, status) {
  return items.filter((i) => i.status === status);
}

/**
 * Filter items by event type.
 * @param {HistoryItem[]} items
 * @param {string} eventType
 * @returns {HistoryItem[]}
 */
export function filterByEventType(items, eventType) {
  return items.filter((i) => i.eventType === eventType);
}
