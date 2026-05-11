---
fileId: contextrail-template:apps:starter:ai-chat:messages
module: apps/starter
stability: evolving
steward: shared
api: module-public
boundedContext: ai-chat
owns: All user-facing UI string literals for the ai-chat feature in the starter app; locale-keyed message map; t, setLocale, getLocale, registerLocale, and resetLocale accessors.
boundaries: Must not import component, adapter, or selector code. Must not duplicate the module-level messages in modules/ai-chat/messages.mjs — this file is the UI-layer complement only. Must not grow into a global app-wide translation layer.
invariants: Every locale must define the same set of message keys; the default locale must always be present; t must not throw for any key defined in the default locale; chat-panel.mjs must use t() from this file, not from modules/ai-chat/messages.mjs.
risks: Key sets diverging across locales are only caught at runtime; renaming a key breaks chat-panel.mjs silently; duplicating keys already in modules/ai-chat/messages.mjs causes copy inconsistency.
notesForLLM: Add new UI keys to all locale blocks simultaneously. This file covers presentation copy only (labels, placeholders, status text). Domain-level error strings live in modules/ai-chat/messages.mjs.
tests: tests/unit/ai-chat-ui.test.mjs
linkedDocs: docs/prd/ai-chat.md
specRefs: TPL-077
related:
  - apps/starter/ai-chat/chat-panel.mjs
  - modules/ai-chat/messages.mjs
summary: i18n messages for the starter app.
---

# messages.mjs
