---
fileId: contextrail-template:modules:user-preferences:messages
module: modules/user-preferences
stability: evolving
steward: shared
api: file-local
boundedContext: user-preferences
summary: i18n message registry for the user-preferences module.
owns: All user-facing text for the user-preferences module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the user-preferences module must come from this registry.
notesForLLM: i18n layer for user-preferences. Add new user-facing strings here, not inline in code.
messageKeys:
  - user-preferences.port.invalid_adapter
  - user-preferences.port.missing_load
  - user-preferences.port.missing_save
  - user-preferences.adapter.indexeddb_unavailable
linkedDocs: modules/user-preferences/README.md
---

# messages.mjs
