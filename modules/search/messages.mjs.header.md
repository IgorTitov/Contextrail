---
fileId: contextrail-template:modules:search:messages
module: modules/search
stability: evolving
steward: shared
api: Messages
boundedContext: search
summary: Bounded i18n message registry for the search module.
owns: English locale for document validation, port assertions, and query option errors.
boundaries: No I/O, no imports from domain/ports/adapters. Pure string registry with locale switching.
invariants: All user-facing copy in search flows through these keys.
notesForLLM: Add new keys here before referencing them from domain or adapters.
specRefs:
  - TPL-001
---

# messages.mjs
