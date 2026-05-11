/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the notifications bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx notifications
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the notifications bounded module.
 * The only file other modules may import.
 */

// Domain — core
export { createNotification, shouldAutoDismiss, resetIdCounter } from './domain/notification.mjs';

// Domain — preferences
export {
  createDefaultPreferences,
  setChannelPreference,
  setMuted,
  resolveChannel,
  muteAll,
  unmuteAll,
} from './domain/preferences.mjs';

// Domain — history
export {
  createHistoryItem,
  markRead,
  markArchived,
  countUnread,
  filterByStatus,
  filterByEventType,
} from './domain/history.mjs';

// Domain — router
export { routeNotification } from './domain/router.mjs';

// Ports
export { assertNotificationPort } from './ports/notification-port.mjs';

// Adapters
export { createMemoryNotificationAdapter } from './adapters/memory-adapter.mjs';
export { createDomNotificationAdapter } from './adapters/dom-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
