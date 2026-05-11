---
fileId: contextrail-template:apps:starter:ai-chat:ui-selectors
module: apps/starter
stability: evolving
steward: shared
api: "{ aiChat }"
boundedContext: ai-chat
owns: All data-testid strings and DOM hook names for the AI chat feature panel; the single source of truth for chat UI automation selectors.
boundaries: Must not import component or adapter code. Must not grow into a global cross-feature selector table — keep it bounded to the ai-chat feature only.
invariants: Every data-testid applied in chat-panel.mjs must exist in this registry; no hardcoded selector strings may appear in chat-panel.mjs or test files; renaming a key here is a breaking change for all consumers.
risks: Renaming a key without updating all consumers (chat-panel.mjs and test files) silently breaks automation targeting; adding selectors directly in templates rather than via this registry causes selector drift.
notesForLLM: Import aiChat from this file whenever a data-testid or DOM id is needed for the chat feature. Do not hardcode selector strings in chat-panel.mjs or in tests — reference them here instead.
tests: tests/unit/ai-chat-ui.test.mjs
linkedDocs: docs/prd/ai-chat.md
specRefs: TPL-077
related:
  - apps/starter/ai-chat/chat-panel.mjs
  - apps/starter/ai-chat/ai-chat-init.mjs
summary: Bounded UI selector registry for the starter app.
---

# ui-selectors.mjs
