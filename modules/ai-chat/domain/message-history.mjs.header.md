---
fileId: contextrail-template:modules:ai-chat:domain:message-history
module: modules/ai-chat
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: ai-chat
owns: createMessageHistory factory; bounded in-memory message list with configurable maxMessages cap; toPromptContext projection for adapter use.
boundaries: Must remain framework-free and have no network or storage dependencies. Must not be called directly from outside the ai-chat module — adapters access it internally.
invariants: History must never grow beyond maxMessages; getMessages must return a defensive copy; toPromptContext must only expose role and content fields to callers.
risks: If maxMessages is misconfigured or ignored, unbounded history growth can exhaust memory in long conversations; sharing a history instance across adapters without isolation causes cross-contamination.
notesForLLM: This is a pure value object factory. No side effects, no imports. Used by adapters to maintain isolated per-adapter history. Do not add persistence or network calls here.
tests: tests/unit/ai-chat.test.mjs
linkedDocs: docs/prd/ai-chat.md
specRefs: TPL-075
related:
  - modules/ai-chat/adapters/echo-adapter.mjs
  - modules/ai-chat/adapters/http-api-adapter.mjs
summary: Bounded in-memory conversation history manager with configurable maxMessages cap and toPromptContext projection for adapter consumption.
allowedDependencies:
  - ./
  - "../ports/*"
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - next
  - electron
  - express
  - fastify
  - vite
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
---

# message-history.mjs
