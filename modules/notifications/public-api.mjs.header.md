---
fileId: contextrail-template:modules:notifications:public-api
module: modules/notifications
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: notifications
dependsOn:
  - modules/notifications/ports/notification-port.mjs
  - modules/notifications/domain/notification-types.mjs
  - modules/notifications/adapters/toast-adapter.mjs
  - modules/notifications/adapters/console-adapter.mjs
summary: Public API facade for the notifications module — re-exports port assertion, notification types, and adapter factories.
owns: The single cross-module entry point for the notifications bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/notifications.test.mjs
  - tests/contract/notifications-hex-contract.test.mjs
  - tests/bdd/notifications.test.mjs
specRefs:
  - TPL-001
linkedDocs:
  - modules/notifications/README.md
  - docs/_generated/dependency-graph.json
allowedDependencies:
  - "./domain/*"
  - "./application/*"
  - "./ports/*"
  - "./adapters/*"
  - "./messages.*"
  - "./types.*"
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/ports/**"
  - "modules/<other>/adapters/**"
  - react
  - express
  - fastify
  - "node:*"
exports:
  - assertNotificationPort
  - countUnread
  - createDefaultPreferences
  - createDomNotificationAdapter
  - createHistoryItem
  - createMemoryNotificationAdapter
  - createNotification
  - filterByEventType
  - filterByStatus
  - getLocale
  - markArchived
  - markRead
  - muteAll
  - registerLocale
  - resetIdCounter
  - resetLocale
  - resolveChannel
  - routeNotification
  - setChannelPreference
  - setLocale
  - setMuted
  - shouldAutoDismiss
  - t
  - unmuteAll
---

# public-api.mjs

