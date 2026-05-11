---
fileId: contextrail-template:modules:scheduler:messages
module: modules/scheduler
stability: evolving
steward: shared
api: file-local
boundedContext: scheduler
summary: i18n message registry for the scheduler module.
owns: All user-facing text for the scheduler module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the scheduler module must come from this registry.
notesForLLM: i18n layer for scheduler. Add new user-facing strings here, not inline in code.
messageKeys:
  - scheduler.port.not_object
  - scheduler.port.missing_method
  - scheduler.cron.invalid
  - scheduler.schedule.not_found
linkedDocs: modules/scheduler/README.md
---

# messages.mjs
