---
fileId: contextrail-template:modules:db:messages
module: modules/db
stability: evolving
steward: shared
api: file-local
boundedContext: db
summary: i18n message registry for the db module.
owns: All user-facing text for the db module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the db module must come from this registry.
notesForLLM: i18n layer for db. Add new user-facing strings here, not inline in code.
messageKeys:
  - db.port.not_object
  - db.port.missing_method
  - db.query_builder.no_table
linkedDocs: modules/db/README.md
---

# messages.mjs
