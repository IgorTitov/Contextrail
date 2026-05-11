---
fileId: contextrail-template:modules:notifications:domain:notification
module: modules/notifications
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: notifications
summary: Factory for notification value objects with severity level (info/success/error), auto-dismiss timer, configurable duration, and auto-incrementing ID.
owns: createNotification factory, DEFAULT_DURATIONS per level, and Notification/NotificationLevel type definitions.
boundaries: Pure domain logic. No infrastructure dependencies allowed.
invariants: Must remain framework-free and testable in isolation.
allowedDependencies:
  - ./
  - "../ports/*"
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - next
  - electron
  - express
  - fastify
  - vite
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
linkedDocs: modules/notifications/domain/README.md
---

# notification.mjs
