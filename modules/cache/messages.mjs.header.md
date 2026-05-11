---
fileId: contextrail-template:modules:cache:messages
module: modules/cache
stability: evolving
steward: shared
api: file-local
boundedContext: cache
summary: i18n message registry for the cache module.
owns: All user-facing text for the cache module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the cache module must come from this registry.
notesForLLM: i18n layer for cache. Add new user-facing strings here, not inline in code.
messageKeys:
  - cache.port.not_object
  - cache.port.missing_get
  - cache.port.missing_set
  - cache.port.missing_delete
  - cache.port.missing_has
  - cache.port.missing_clear
  - cache.port.missing_size
  - cache.port.missing_keys
linkedDocs: modules/cache/README.md
---

# messages.mjs
