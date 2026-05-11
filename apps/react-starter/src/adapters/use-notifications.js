/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Notifications adapter hook for the react-starter React app.
 * @sidecar use-notifications.js.header.md
 * @layer app | @hex adapter | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * React adapter for the hex notifications module.
 *
 * Domain logic (createNotification, assertNotificationPort) comes
 * from modules/notifications — unchanged, framework-free.
 * This hook adds React state for the active toast list.
 */

import { useState, useCallback, useRef } from 'react';
import {
  createNotification,
  assertNotificationPort,
} from '@modules/notifications/public-api.mjs';

/**
 * React hook wrapping the hex notifications port adapter.
 *
 * @returns {{
 *   toasts: Array,
 *   notify: (message: string, level?: string) => void,
 *   dismiss: (id: string) => void,
 * }}
 */
export function useNotifications() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const adapter = useRef(null);
  if (!adapter.current) {
    adapter.current = {
      show(notification) {
        setToasts((prev) => [...prev, notification]);
        if (notification.autoDismiss && notification.duration > 0) {
          const timer = setTimeout(() => dismiss(notification.id), notification.duration);
          timersRef.current.set(notification.id, timer);
        }
      },
      dismiss(id) {
        dismiss(id);
      },
      getActive() {
        return [];
      },
    };
    assertNotificationPort(adapter.current);
  }

  const notify = useCallback(
    (message, level = 'info') => {
      adapter.current.show(createNotification(message, level));
    },
    [],
  );

  return { toasts, notify, dismiss };
}
