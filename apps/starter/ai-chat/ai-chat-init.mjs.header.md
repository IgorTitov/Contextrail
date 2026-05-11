---
fileId: contextrail-template:apps:starter:ai-chat:ai-chat-init
module: apps/starter
stability: evolving
steward: shared
api: "{ initAiChat }"
boundedContext: ai-chat
dependsOn:
  - modules/ai-chat/public-api.mjs
  - apps/starter/ai-chat/chat-panel.mjs
owns: Adapter selection logic (default echo, injectable override); panel mounting into the supplied container; destroy lifecycle forwarding.
boundaries: Must not contain DOM rendering logic — that belongs in chat-panel.mjs. Must not hardcode a real API endpoint or credentials. The adapter swap seam must remain injectable, not hard-switched.
invariants: The returned destroy must remove the panel element and clean up adapter listeners; the default adapter must be echo unless the caller supplies an override.
risks: Missing destroy call leaves the panel element in the DOM and leaks adapter listeners; swapping the default from echo to a real backend without a feature flag breaks the zero-config dev experience.
notesForLLM: Call initAiChat(container) for the default echo experience. Pass options.adapter to inject a real backend adapter without changing this file. Always call the returned destroy when the feature is torn down.
tests: tests/unit/ai-chat-ui.test.mjs
linkedDocs: docs/prd/ai-chat.md
specRefs: TPL-078
related:
  - apps/starter/ai-chat/chat-panel.mjs
  - modules/ai-chat/public-api.mjs
summary: Ai Chat Init for the starter app.
---

# ai-chat-init.mjs
