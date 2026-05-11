/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Notification domain logic for the notifications module.
 * @sidecar notification.mjs.header.md
 * @layer module | @hex domain | @ctx notifications
 * @public false
 * @edit careful
 */

/**
 * Pure domain logic for notifications.
 * Framework-free, no external dependencies.
 */

/**
 * @typedef {'info' | 'success' | 'error'} NotificationLevel
 * @typedef {{ id: string, message: string, level: NotificationLevel, autoDismiss: boolean, duration: number, timestamp: number }} Notification
 */

const DEFAULT_DURATIONS = { info: 5000, success: 5000, error: 0 };

let idCounter = 0;

/**
 * Create a notification value object.
 *
 * @param {string} message
 * @param {NotificationLevel} [level='info']
 * @param {object} [options]
 * @param {boolean} [options.autoDismiss]
 * @param {number} [options.duration]
 * @returns {Notification}
 */
export function createNotification(message, level = 'info', options = {}) {
  const duration = options.duration ?? DEFAULT_DURATIONS[level] ?? 5000;
  const autoDismiss = options.autoDismiss ?? duration > 0;
  return {
    id: `notif-${++idCounter}`,
    message,
    level,
    autoDismiss,
    duration,
    timestamp: Date.now(),
  };
}

/**
 * Check whether a notification should auto-dismiss.
 * @param {Notification} notification
 * @returns {boolean}
 */
export function shouldAutoDismiss(notification) {
  return notification.autoDismiss && notification.duration > 0;
}

/**
 * Reset the internal ID counter. Useful in tests.
 */
export function resetIdCounter() {
  idCounter = 0;
}
