---
fileId: contextrail-template:modules:notifications:messages
module: modules/notifications
stability: evolving
steward: shared
api: file-local
boundedContext: notifications
summary: i18n message registry for the notifications module.
owns: All user-facing text for the notifications module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the notifications module must come from this registry.
notesForLLM: i18n layer for notifications. Add new user-facing strings here, not inline in code.
messageKeys:
  - notifications.port.invalid_adapter
  - notifications.port.missing_method
linkedDocs: modules/notifications/README.md
---

# messages.mjs
