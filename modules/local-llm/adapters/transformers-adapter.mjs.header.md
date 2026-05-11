---
fileId: contextrail-template:modules:local-llm:adapters:transformers-adapter
module: modules/local-llm
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: local-llm
dependsOn: modules/local-llm/messages.mjs
owns: WASM-backed LocalLlmPort implementation; per-instance pipeline lifecycle and history management; per-instance listener set; progress reporting during model download and initialization; token-level streaming via callback_function.
boundaries: Must not make network calls outside of @xenova/transformers pipeline initialization. Must not be used as a server-side or non-browser adapter for production inference. Must not be imported directly by app code — exposed only through modules/local-llm/public-api.mjs.
invariants: Must satisfy every method required by both LocalLlmPort and AiChatPort; sendMessage and streamMessage must throw with a localized error when no model is loaded; each createTransformersAdapter call must produce an isolated instance; progress callbacks must cover downloading, initializing, and ready stages.
risks: Shared idCounter is module-level and not reset between test runs — tests must not rely on exact id values; WASM availability varies by environment so Node tests must inject _checkWasm; @xenova/transformers progress_callback uses a 0–100 scale (not 0–1) which must be normalized correctly.
notesForLLM: Runs entirely in the browser or Node. Model download and warm-up can be slow; cache loaded models through the port contract.
externalSystems: "@xenova/transformers (browser WASM, dynamic import)"
tests: tests/unit/local-llm.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-082
related:
  - modules/local-llm/ports/local-llm-port.mjs
  - modules/local-llm/public-api.mjs
  - modules/local-llm/adapters/webllm-adapter.mjs
allowedDependencies:
  - modules/ai-chat/public-api.mjs
  - modules/local-llm/messages.mjs
summary: Transformers.js adapter for the local-llm module. Runs models in-process via ONNX Runtime.
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

# transformers-adapter.mjs
