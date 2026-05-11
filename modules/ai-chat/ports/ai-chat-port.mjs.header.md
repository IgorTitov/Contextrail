---
fileId: contextrail-template:modules:ai-chat:ports:ai-chat-port
module: modules/ai-chat
stability: evolving
steward: shared
api: module-public
hexLayer: port
portType: inbound
boundedContext: ai-chat
owns: AiChatPort interface; AiChatMessage, AiChatResponse, AiChatOptions, AiChatStreamChunk type definitions; assertAiChatPort runtime validator.
boundaries: Must not contain adapter logic, framework references, or network coupling. Must not evolve into an abstract base class.
invariants: assertAiChatPort must throw for any object missing required port methods; type shapes must remain stable within a minor version; this file must have no runtime dependencies.
risks: Changing type shapes breaks every adapter and integration silently if not covered by contract tests; assertAiChatPort gaps allow non-compliant adapters to pass through.
notesForLLM: This is the sole shape authority for the ai-chat port. Changes here cascade to all adapters and consumers. Expand assertAiChatPort checks when adding new required methods.
tests:
  - tests/unit/ai-chat.test.mjs
  - tests/contract/ai-chat-hex-contract.test.mjs
linkedDocs: docs/prd/ai-chat.md
specRefs: TPL-072
related:
  - modules/ai-chat/public-api.mjs
  - modules/ai-chat/domain/message-history.mjs
summary: Ai Chat port contract for the ai-chat module.
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
---

# ai-chat-port.mjs
