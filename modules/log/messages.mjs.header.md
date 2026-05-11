---
fileId: contextrail-template:modules:log:messages
module: modules/log
stability: evolving
steward: shared
api: file-local
boundedContext: log
summary: i18n message registry for the log module.
owns: All user-facing text for the log module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the log module must come from this registry.
notesForLLM: i18n layer for log. Add new user-facing strings here, not inline in code.
messageKeys:
  - log.port.invalid_adapter
  - log.port.missing_method
linkedDocs: modules/log/README.md
---

# messages.mjs
