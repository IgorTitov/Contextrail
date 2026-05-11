---
fileId: contextrail-template:modules:event-bus:messages
module: modules/event-bus
stability: evolving
steward: shared
api: file-local
boundedContext: event-bus
summary: i18n message registry for the event-bus module.
owns: All user-facing text for the event-bus module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the event-bus module must come from this registry.
notesForLLM: i18n layer for event-bus. Add new user-facing strings here, not inline in code.
messageKeys:
  - event-bus.port.invalid_adapter
  - event-bus.port.missing_method
  - event-bus.domain.handler_not_function
linkedDocs: modules/event-bus/README.md
---

# messages.mjs
