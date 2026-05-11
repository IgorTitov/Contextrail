---
fileId: contextrail-template:apps:starter:local-llm:local-llm-init
module: apps/starter
stability: evolving
steward: shared
api: file-local
dependsOn:
  - modules/local-llm/public-api.mjs
  - apps/starter/local-llm/local-llm-panel.mjs
owns: initLocalLlm factory that instantiates the cacheManager and panel, routes model backend selection (webllm vs transformers) to the correct adapter factory, and propagates the loaded adapter to the host app via onAdapterReady callback.
boundaries: Must not contain UI rendering logic — that belongs in local-llm-panel.mjs. Must not call adapter methods (sendMessage, etc.) directly — the host app receives the adapter via onAdapterReady. Must import only from modules/local-llm/public-api.mjs, not from module internals.
invariants: Adapter selection must be driven exclusively by modelConfig.backend; destroy() must remove the panel element from the DOM and delegate lifecycle cleanup to the panel; WebGPU and WASM capability checks must use real browser globals in this file, not mocks.
risks: Tight coupling between backend routing logic here and adapter constructors means adding a new backend requires updating this file; not calling destroy() on unmount leaks the adapter and leaves the panel element in the DOM.
notesForLLM: "initLocalLlm is the app-level entry point for the local-llm feature. The host app calls it with a container and an onAdapterReady callback. Backend routing (modelConfig.backend === 'webllm' ? createWebLlmAdapter : createTransformersAdapter) happens in the local createAdapter closure."
tests: tests/unit/local-llm-ui.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-085
related:
  - apps/starter/local-llm/local-llm-panel.mjs
  - modules/local-llm/public-api.mjs
summary: Local Llm Init for the starter app.
---

# local-llm-init.mjs
