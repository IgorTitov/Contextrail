/* @HEADER
 * @version 0.6.5 | 2026-04-28
 * @purpose NotificationList React component for the react-starter app.
 * @sidecar NotificationList.jsx.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { selectors } from '../selectors.js';

/**
 * Renders the active toast notifications.
 * Notification domain logic comes from the hex module; this is pure display.
 */
export function NotificationList({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <ul data-testid={selectors.toastList} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <li key={toast.id} data-testid={selectors.toastItem}>
          <span>{toast.message}</span>
          <button
            data-testid={selectors.dismissButton}
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </li>
      ))}
    </ul>
  );
}
