<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the notifications hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx notifications
@public false
@edit careful -->

# notifications

Hexagonal bounded module for toast-style notifications (info, success, error).

## Architecture

| Layer | File | Responsibility |
|-------|------|---------------|
| Domain | `domain/notification.mjs` | Pure functions: `createNotification()`, `shouldAutoDismiss()` |
| Ports | `ports/notification-port.mjs` | `NotificationPort` contract + `assertNotificationPort()` validator |
| Adapters | `adapters/memory-adapter.mjs` | In-memory adapter for tests |
| Adapters | `adapters/dom-adapter.mjs` | Browser DOM adapter with ARIA live region |
| Public API | `public-api.mjs` | Single cross-module entry point |

## Usage

```js
import {
  createNotification,
  createMemoryNotificationAdapter,
  assertNotificationPort,
} from '../../modules/notifications/public-api.mjs';

const adapter = createMemoryNotificationAdapter();
assertNotificationPort(adapter);

const notif = createNotification('Saved successfully', 'success');
adapter.show(notif);
```

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/`, `ports/`, or `adapters/` are forbidden.
- Domain must stay framework-free.
