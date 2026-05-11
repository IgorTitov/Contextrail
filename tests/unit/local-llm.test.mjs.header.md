---
fileId: contextrail-template:tests:unit:local-llm.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn:
  - modules/local-llm/public-api.mjs
  - modules/ai-chat/public-api.mjs
summary: Prove pure-logic contracts for the local-llm module — port assertion, WebLLM adapter, Transformers.js adapter, and model cache manager.
owns: Unit-level proof of local-llm module pure logic — port assertion validation, adapter lifecycle, history management, streaming simulation, listener management, and factory independence.
boundaries: Must only test through public-api.mjs; must not deep-import module internals; browser-specific APIs (WebGPU, WASM, Cache API) are injected via test doubles.
invariants: All adapters must pass both assertLocalLlmPort and assertAiChatPort; factory calls must be independent; model loading must be explicit.
risks: Mock implementations may drift from real WebLLM/Transformers.js API shapes — keep mocks minimal and aligned with actual library contracts.
notesForLLM: Uses injected _importLib and _checkWebGPU/_checkWasm test doubles for adapter testing in Node.js. DOM testing belongs in E2E tests.
tests: self
linkedDocs: docs/prd/local-llm.md
specRefs:
  - TPL-080
  - TPL-081
  - TPL-082
  - TPL-083
  - TPL-084
related:
  - modules/local-llm/public-api.mjs
  - tests/unit/ai-chat.test.mjs
---

# local-llm.test.mjs
