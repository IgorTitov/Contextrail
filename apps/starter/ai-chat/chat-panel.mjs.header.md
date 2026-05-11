---
fileId: contextrail-template:apps:starter:ai-chat:chat-panel
module: apps/starter
stability: evolving
steward: shared
api: "{ createChatPanel }"
boundedContext: ai-chat
dependsOn:
  - apps/starter/ai-chat/messages.mjs
  - apps/starter/ai-chat/ui-selectors.mjs
  - modules/ai-chat/public-api.mjs
owns: Chat panel DOM structure; message bubble rendering; typing indicator visibility; send button and Enter-key wiring; adapter listener registration and cleanup via destroy.
boundaries: Must not import a concrete adapter — the adapter is always injected. Must not hardcode data-testid or aria attributes as strings; all selectors must come from ui-selectors.mjs. Must not contain routing or auth logic.
invariants: destroy must call adapter.offMessage to prevent listener leaks; all user-visible strings must come from messages.mjs t(); data-testid values must come from ui-selectors.mjs aiChat registry.
risks: Missing destroy call leaks adapter listeners across re-mounts; hardcoded selector strings diverge from ui-selectors.mjs registry and break tests silently.
notesForLLM: The adapter is injected by ai-chat-init.mjs. Use aiChat selectors from ui-selectors.mjs for all data-testid attributes. Keep DOM construction framework-free — no React, no Vue.
tests: tests/unit/ai-chat-ui.test.mjs
linkedDocs: docs/prd/ai-chat.md
specRefs: TPL-077
related:
  - apps/starter/ai-chat/ai-chat-init.mjs
  - apps/starter/ai-chat/ui-selectors.mjs
  - apps/starter/ai-chat/messages.mjs
summary: Chat Panel for the starter app.
---

# chat-panel.mjs
