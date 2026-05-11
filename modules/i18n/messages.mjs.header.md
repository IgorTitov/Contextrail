---
fileId: contextrail-template:modules:i18n:messages
module: modules/i18n
stability: evolving
steward: shared
api: file-local
boundedContext: i18n
summary: i18n message registry for the i18n module.
owns: All user-facing text for the i18n module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the i18n module must come from this registry.
notesForLLM: i18n layer for i18n. Add new user-facing strings here, not inline in code.
messageKeys:
  - i18n.port.invalid_adapter
  - i18n.port.missing_method
  - i18n.registry.invalid_namespace
  - i18n.registry.invalid_locale
  - i18n.registry.invalid_messages
linkedDocs: modules/i18n/README.md
---

# messages.mjs
