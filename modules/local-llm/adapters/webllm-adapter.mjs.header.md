---
fileId: contextrail-template:modules:local-llm:adapters:webllm-adapter
module: modules/local-llm
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: local-llm
dependsOn: modules/local-llm/messages.mjs
owns: WebGPU-backed LocalLlmPort implementation; per-instance engine lifecycle and history management; per-instance listener set; progress reporting during model download and initialization.
boundaries: Must not make network calls outside of web-llm engine initialization. Must not be used as a server-side or Node.js adapter. Must not be imported directly by app code — exposed only through modules/local-llm/public-api.mjs.
invariants: Must satisfy every method required by both LocalLlmPort and AiChatPort; sendMessage and streamMessage must throw with a localized error when no model is loaded; each createWebLlmAdapter call must produce an isolated instance; progress callbacks must cover downloading, initializing, and ready stages.
risks: Shared idCounter is module-level and not reset between test runs — tests must not rely on exact id values; WebGPU availability is browser-only so Node tests must inject _checkWebGPU; dynamic import of web-llm adds a boot latency that tests should account for via the _importLib seam.
notesForLLM: Browser-only; requires WebGPU. First-run download of weights is large — warn users or pre-fetch through the port contract.
externalSystems: web-llm (browser WebGPU, dynamic import)
tests: tests/unit/local-llm.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-081
related:
  - modules/local-llm/ports/local-llm-port.mjs
  - modules/local-llm/public-api.mjs
  - modules/local-llm/adapters/transformers-adapter.mjs
allowedDependencies:
  - modules/ai-chat/public-api.mjs
  - modules/local-llm/messages.mjs
summary: WebLLM browser adapter for the local-llm module. Runs LLMs locally on WebGPU.
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: infrastructure
implementsPort: local-llm-port
runtimeEnvironment: universal
transport: ipc
---

# webllm-adapter.mjs
