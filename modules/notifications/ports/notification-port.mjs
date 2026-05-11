/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Notification port contract for the notifications module.
 * @sidecar notification-port.mjs.header.md
 * @layer module | @hex port | @ctx notifications
 * @public false
 * @edit careful
 */

/**
 * Port contract for notification display adapters.
 *
 * @typedef {object} NotificationPort
 * @property {(notification: import('../domain/notification.mjs').Notification) => void} show
 * @property {(id: string) => void} dismiss
 * @property {() => import('../domain/notification.mjs').Notification[]} getActive
 */

import { t } from '../messages.mjs';

const REQUIRED_METHODS = ['show', 'dismiss', 'getActive'];

/**
 * Validate that an adapter conforms to the NotificationPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertNotificationPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('notifications.port.invalid_adapter'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('notifications.port.missing_method', { method }));
    }
  }
}
