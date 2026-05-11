---
fileId: contextrail-template:modules:email:messages
module: modules/email
stability: evolving
steward: shared
api: Messages
boundedContext: email
summary: Bounded i18n message registry for the email module.
owns: English locale for email validation, port assertions, and adapter errors.
boundaries: No I/O, no imports from domain/ports/adapters. Pure string registry with locale switching.
invariants: All user-facing copy in email flows through these keys.
notesForLLM: Add new keys here before referencing them from domain or adapters.
specRefs:
  - TPL-001
---

# messages.mjs
