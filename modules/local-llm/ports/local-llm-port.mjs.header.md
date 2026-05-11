---
fileId: contextrail-template:modules:local-llm:ports:local-llm-port
module: modules/local-llm
stability: evolving
steward: shared
api: module-public
hexLayer: port
portType: inbound
boundedContext: local-llm
owns: LocalLlmPort interface; LocalLlmProgress, LocalLlmModelConfig, LocalLlmLoadOptions type definitions; assertLocalLlmPort runtime validator combining AiChatPort and lifecycle method checks.
boundaries: Must not contain adapter logic, browser API references, or model download code. Must not evolve into an abstract base class. Must remain the sole shape authority for the local-llm port contract.
invariants: assertLocalLlmPort must check AiChatPort methods (inlined) then lifecycle methods; type shapes must remain stable within a minor version; AI_CHAT_METHODS list must stay in sync with modules/ai-chat/ports/ai-chat-port.mjs.
risks: Changing type shapes breaks every adapter silently if not covered by contract tests; gaps in assertLocalLlmPort allow non-compliant adapters to pass through; adding new required methods without updating assertLocalLlmPort creates a silent validation hole.
notesForLLM: This is the sole shape authority for the local-llm port. Changes here cascade to all adapters. assertLocalLlmPort delegates AiChatPort checks to assertAiChatPort, then adds loadModel, unloadModel, and isModelLoaded. Expand both validators together when adding new required methods.
tests:
  - tests/unit/local-llm.test.mjs
  - tests/contract/local-llm-hex-contract.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-080
related:
  - modules/local-llm/public-api.mjs
  - modules/ai-chat/ports/ai-chat-port.mjs
  - modules/local-llm/adapters/webllm-adapter.mjs
  - modules/local-llm/adapters/transformers-adapter.mjs
allowedDependencies: modules/ai-chat/public-api.mjs
summary: Local Llm port contract for the local-llm module.
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
contractTests: tests/contract/local-llm-hex-contract.test.mjs
---

# local-llm-port.mjs
