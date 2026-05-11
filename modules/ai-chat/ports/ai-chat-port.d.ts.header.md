---
fileId: contextrail-template:modules:ai-chat:ports:ai-chat-port.d
module: modules/ai-chat
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: ai-chat
summary: Ai Chat Port.D port for the ai-chat module.
owns: Ai Chat Port.D port within the ai-chat module.
boundaries: Scoped to the ai-chat module. Do not use outside this module boundary.
invariants: Must remain consistent with the ai-chat module's port contracts.
notesForLLM: Part of the ai-chat module. Access through public-api.mjs from outside the module.
allowedDependencies:
  - ./
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - express
  - fastify
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
portCategory: llm
contractTests: tests/contract/ai-chat-hex-contract.test.mjs
linkedDocs: modules/ai-chat/ports/README.md
---

# ai-chat-port.d.ts
