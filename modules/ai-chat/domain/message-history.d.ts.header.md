---
fileId: contextrail-template:modules:ai-chat:domain:message-history.d
module: modules/ai-chat
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: ai-chat
summary: Message History.D implementation for the ai-chat module.
owns: Message History.D implementation within the ai-chat module.
boundaries: Scoped to the ai-chat module. Do not use outside this module boundary.
invariants: Must remain consistent with the ai-chat module's port contracts.
notesForLLM: Part of the ai-chat module. Access through public-api.mjs from outside the module.
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
linkedDocs: modules/ai-chat/domain/README.md
---

# message-history.d.ts
