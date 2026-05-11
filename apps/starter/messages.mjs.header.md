---
fileId: contextrail-template:apps:starter:messages
module: apps/starter
stability: evolving
steward: shared
api: file-local
summary: i18n messages for the starter app.
owns: User-facing text and locale management for starter.
boundaries: Message definitions and locale helpers only. No business logic.
invariants: All user-facing copy in starter must go through this layer.
notesForLLM: i18n layer. Add new user-facing strings here, not inline in templates.
---

# messages.mjs
