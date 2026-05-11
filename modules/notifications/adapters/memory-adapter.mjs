/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Memory adapter for the notifications module.
 * @sidecar memory-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx notifications
 * @public false
 * @edit careful
 */

/**
 * In-memory notification adapter for testing.
 * Implements the NotificationPort contract.
 *
 * @returns {import('../ports/notification-port.mjs').NotificationPort}
 */
export function createMemoryNotificationAdapter() {
  /** @type {import('../domain/notification.mjs').Notification[]} */
  const active = [];

  return {
    show(notification) {
      active.push({ ...notification });
    },
    dismiss(id) {
      const idx = active.findIndex((n) => n.id === id);
      if (idx >= 0) active.splice(idx, 1);
    },
    getActive() {
      return [...active];
    },
  };
}
