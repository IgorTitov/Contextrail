<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for the Local LLM hex module that provides in-browser LLM adapters conforming to AiChatPort, with model loading lifecycle management and browser-based model caching.
@sidecar local-llm.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# In-Browser LLM Module

## Requirement intent

The starter template needs a hex module that enables running LLM inference directly in the browser without requiring a backend server. This module provides adapters conforming to AiChatPort from the ai-chat module, so any consumer already wired for ai-chat can swap in a local LLM adapter transparently.

The **local-llm** module provides:

- A **LocalLlmPort** that extends the ai-chat concept with model loading lifecycle operations (loadModel, unloadModel, isModelLoaded) and progress reporting during model download and initialization. This port composes with AiChatPort -- an adapter that satisfies LocalLlmPort also satisfies AiChatPort.

- A **WebLLM adapter** that uses the `web-llm` library to run LLMs in the browser via WebGPU. The adapter dynamically imports `web-llm` at runtime so the module does not bundle the library. It provides model loading with progress callbacks, sendMessage/streamMessage conforming to AiChatPort, and proper resource cleanup on unload.

- A **Transformers.js adapter** that uses `@xenova/transformers` to run ONNX-format models in the browser via WASM. The adapter dynamically imports `@xenova/transformers` at runtime. It provides the same AiChatPort conformance and model loading lifecycle as the WebLLM adapter.

- A **Model Cache Manager** domain utility for managing cached models in browser storage (IndexedDB / Cache API). It can check which models are cached, estimate storage usage, clear cached models, and list available model configurations.

- A **public API** surface that exports all factories, type helpers, and the port assertion, following the JSDoc + `.d.ts` sidecar typing pattern established by other modules.

The module does NOT bundle any ML models. Models are downloaded at runtime by the user when they choose to load a local model. Actual library availability (WebLLM requires WebGPU; Transformers.js requires WASM) is checked at runtime, and the adapters fail gracefully with clear error messages when the required runtime capabilities are absent.

All user-facing copy (error messages, status descriptions, progress labels) must go through the i18n/messages layer.

## Classification

This is **mixed technical/architectural** work. The local-llm module provides reusable infrastructure that extends the ai-chat pattern for in-browser inference. The starter app integration demonstrates how to wire the local LLM option into the existing chat panel. USM is intentionally skipped because this work extends an existing technical infrastructure pattern rather than introducing new user-facing workflows.

## Deliverables in scope (Slice 10)

### Module: Local LLM (`modules/local-llm/`)

#### 1. LocalLlmPort Definition (TPL-080)

Hex port at `modules/local-llm/ports/local-llm-port.mjs`.

**LocalLlmPort interface (extends AiChatPort):**

All AiChatPort methods are required:

- `sendMessage(message, options?)` -- sends a user message; returns a Promise resolving to an AiChatResponse
- `streamMessage(message, options?)` -- sends a user message and returns an async iterable of AiChatStreamChunk
- `getHistory()` -- returns the current conversation history array
- `clearHistory()` -- clears the conversation history
- `onMessage(listener)` -- registers a message listener; returns an unsubscribe function
- `offMessage(listener)` -- removes a message listener

Additional model lifecycle methods:

- `loadModel(modelId, options?)` -- initiates model download and initialization; returns a Promise that resolves when the model is ready. Accepts an optional `onProgress(progress)` callback in options for reporting download/initialization progress
- `unloadModel()` -- releases model resources and clears GPU/WASM memory; returns a Promise
- `isModelLoaded()` -- returns a boolean indicating whether a model is currently loaded and ready for inference

**Domain types (in addition to ai-chat types):**

- `LocalLlmProgress` -- progress object with `stage` ('downloading' | 'initializing' | 'ready' | 'error'), `progress` (number, 0-1), optional `message` (string), optional `bytesLoaded` (number), optional `bytesTotal` (number)
- `LocalLlmModelConfig` -- model configuration with `modelId` (string), `displayName` (string), `sizeBytes` (number, approximate), `backend` ('webllm' | 'transformers'), optional `quantization` (string), optional `contextLength` (number)
- `LocalLlmLoadOptions` -- load options with optional `onProgress` (callback receiving LocalLlmProgress), optional `contextLength` (number), optional `quantization` (string)

Constraints: The port must be framework-free and testable in isolation. It must compose with AiChatPort -- any adapter satisfying LocalLlmPort also satisfies AiChatPort. The runtime assertion `assertLocalLlmPort` must validate both the AiChatPort methods and the additional lifecycle methods. Error messages must be i18n-ready string keys.

#### 2. WebLLM Adapter (TPL-081)

Adapter at `modules/local-llm/adapters/webllm-adapter.mjs`.

- Factory function `createWebLlmAdapter(options?)` returning a fresh adapter instance
- `loadModel(modelId, options?)` -- dynamically imports `web-llm`, initializes the engine, downloads and loads the specified model. Reports progress via the `onProgress` callback. Throws with an i18n error key if WebGPU is not available
- `unloadModel()` -- releases the WebLLM engine and GPU resources
- `isModelLoaded()` -- returns whether a model is currently loaded
- `sendMessage(message, options?)` -- delegates to the loaded WebLLM engine for inference; throws with an i18n error key if no model is loaded
- `streamMessage(message, options?)` -- uses WebLLM's streaming interface to yield partial responses as AiChatStreamChunk
- Maintains conversation history via the MessageHistory manager from ai-chat (imported through ai-chat's public-api.mjs)
- Message listeners are notified for both user and assistant messages
- Runtime check for WebGPU availability before attempting model load

Constraints: Must conform to both LocalLlmPort and AiChatPort interfaces. Must pass both runtime port assertions. Must dynamically import `web-llm` (not a static import). Must not bundle or embed any model weights. Must check WebGPU availability at runtime and fail gracefully with i18n error keys. Must import MessageHistory only through ai-chat's public-api.mjs. Must be stateless across separate factory calls. The factory must not trigger model loading -- loading is explicit via `loadModel()`.

#### 3. Transformers.js Adapter (TPL-082)

Adapter at `modules/local-llm/adapters/transformers-adapter.mjs`.

- Factory function `createTransformersAdapter(options?)` returning a fresh adapter instance
- `loadModel(modelId, options?)` -- dynamically imports `@xenova/transformers`, downloads and loads the specified ONNX model. Reports progress via the `onProgress` callback. Throws with an i18n error key if WASM is not available
- `unloadModel()` -- releases the model pipeline and WASM resources
- `isModelLoaded()` -- returns whether a model is currently loaded
- `sendMessage(message, options?)` -- delegates to the loaded Transformers.js pipeline for inference; throws with an i18n error key if no model is loaded
- `streamMessage(message, options?)` -- uses Transformers.js text generation with streaming callback to yield partial responses as AiChatStreamChunk
- Maintains conversation history via the MessageHistory manager from ai-chat (imported through ai-chat's public-api.mjs)
- Message listeners are notified for both user and assistant messages

Constraints: Must conform to both LocalLlmPort and AiChatPort interfaces. Must pass both runtime port assertions. Must dynamically import `@xenova/transformers` (not a static import). Must not bundle or embed any model weights. Must check WASM availability at runtime and fail gracefully with i18n error keys. Must import MessageHistory only through ai-chat's public-api.mjs. Must be stateless across separate factory calls. The factory must not trigger model loading -- loading is explicit via `loadModel()`.

#### 4. Model Cache Manager (TPL-083)

Domain utility at `modules/local-llm/domain/model-cache-manager.mjs`.

- `createModelCacheManager()` -- factory returning a cache manager instance
- `getCachedModels()` -- returns an array of model IDs that are currently cached in browser storage
- `isModelCached(modelId)` -- checks whether a specific model is cached
- `estimateStorageUsage()` -- returns an estimate of storage used by cached models (bytes used, bytes available)
- `clearModelCache(modelId?)` -- clears a specific model's cache, or all cached models if no modelId is provided
- `getAvailableModels()` -- returns the list of known LocalLlmModelConfig entries (built-in model registry with display names, approximate sizes, and backend requirements)

Constraints: Must be a pure domain utility. Must not depend on any external module other than browser storage APIs (IndexedDB, Cache API, navigator.storage). Must not import from outside the local-llm module boundary except for type references. Must handle environments where storage APIs are unavailable (e.g., server-side rendering, restricted contexts) gracefully with i18n error keys. Returned arrays must be immutable copies.

#### 5. Public API + Types (TPL-084)

`modules/local-llm/public-api.mjs` exporting:

- `assertLocalLlmPort`
- `createWebLlmAdapter`
- `createTransformersAdapter`
- `createModelCacheManager`
- Domain type constructors or helpers as needed

Plus `public-api.d.ts` sidecar re-exporting all types including LocalLlmProgress, LocalLlmModelConfig, LocalLlmLoadOptions, and the LocalLlmPort type.

Plus `modules/local-llm/messages.mjs` containing all i18n message keys for the module.

Constraints: Only the documented surface is exported. Internal implementation details are not accessible through the public API. The typing pattern (JSDoc + `.d.ts` sidecar) must follow the reference established by ai-chat, feature-seams, auth, and api-client. The module must work without any build step.

### Starter App Integration (`apps/starter/`)

#### 6. Local LLM Integration in Starter App (TPL-085)

Wires the local LLM option into the starter app's existing chat panel.

- Adds a "Local LLM" adapter option to the chat panel's adapter selection (alongside the existing echo adapter)
- Uses the feature-seams mechanism for adapter swap (echo -> local-llm)
- Shows model selection UI -- a list of available models from the model cache manager's `getAvailableModels()`
- Shows model loading UI with a progress bar driven by the `onProgress` callback
- Shows model status indicators (not loaded / downloading / initializing / ready / error)
- Disables chat input until a model is loaded
- Shows storage usage information from the model cache manager
- Provides a "Clear cache" action for model management
- Graceful degradation: if WebGPU and WASM are both unavailable, shows an informational message instead of the model selector
- All UI copy through i18n/messages layer
- All automation-facing DOM hooks from bounded ui-selectors registry

Constraints: Must not break existing starter features. Must not break the existing echo adapter default. The local LLM option must be additive -- the echo adapter remains the default. Adapter swap must go through the feature-seams mechanism. Must handle the model-not-loaded state cleanly. Must not trigger model download without explicit user action. Must use design tokens for styling. Framework-free vanilla JS.

## Out of scope

- Bundling WebLLM or Transformers.js libraries with the template
- Bundling or shipping any ML model weights
- Fine-tuning or model training
- Model format conversion (GGUF, ONNX, etc.)
- Custom model upload from local filesystem
- Multi-model simultaneous inference
- GPU resource sharing or arbitration between tabs
- Model quantization at runtime
- Offline-first PWA model management
- Token counting or cost estimation for local models
- Persistent conversation storage
- Multi-conversation management
- RAG pipeline or document retrieval
- Tool/function calling support
- Image or multimodal model support
- Voice input/output
- Server-side model inference fallback
- Automatic model recommendation based on device capabilities
- Model performance benchmarking UI

## Cross-cutting constraints

- Module uses vanilla JS (ESM, no build step)
- The module follows the hex port/adapter pattern consistent with existing modules (ai-chat, auth, api-client, event-bus, state)
- Cross-module access goes through `public-api.mjs` only
- The local-llm module may import from ai-chat's `public-api.mjs` for MessageHistory and type references
- No new framework or runtime dependency (WebLLM and Transformers.js are dynamically imported, not bundled)
- JSDoc + `.d.ts` sidecar typing pattern following the established reference
- All user-facing copy (error messages, progress labels, status descriptions, UI labels) must use i18n message keys
- Existing starter features must continue to work identically
- Automation-facing DOM hooks from bounded ui-selectors registry
- Models are downloaded at runtime by explicit user action only
- Runtime capability checks (WebGPU for WebLLM, WASM for Transformers.js) must fail gracefully
- The module must not assume any specific model is available -- all model references come from the model config registry

## Acceptance boundaries

### Slice 10

- LocalLlmPort defines loadModel, unloadModel, and isModelLoaded operations in addition to all AiChatPort operations
- Domain types define LocalLlmProgress with stage, progress, and optional message/bytes fields
- Domain types define LocalLlmModelConfig with modelId, displayName, sizeBytes, and backend fields
- assertLocalLlmPort validates both AiChatPort methods and additional lifecycle methods
- WebLLM adapter dynamically imports web-llm and checks WebGPU availability at runtime
- WebLLM adapter loadModel reports progress via onProgress callback
- WebLLM adapter sendMessage and streamMessage conform to AiChatPort and throw if no model is loaded
- WebLLM adapter unloadModel releases GPU resources
- Transformers.js adapter dynamically imports @xenova/transformers and checks WASM availability
- Transformers.js adapter loadModel reports progress via onProgress callback
- Transformers.js adapter sendMessage and streamMessage conform to AiChatPort and throw if no model is loaded
- Transformers.js adapter unloadModel releases WASM resources
- Model cache manager lists cached models, checks individual cache status, and estimates storage
- Model cache manager clears specific or all cached models
- Model cache manager provides a built-in registry of available model configurations
- All adapters pass both assertLocalLlmPort and assertAiChatPort runtime assertions
- Starter app shows a local LLM adapter option alongside the echo adapter default
- Starter app displays model selection from available models list
- Starter app shows a progress bar during model loading
- Starter app disables chat input until a model is loaded and ready
- Starter app degrades gracefully when WebGPU and WASM are unavailable
- Model download does not start without explicit user action
- All error messages and UI copy use i18n message keys
- JSDoc typedefs are present in all source files and reference the `.d.ts` sidecars
- `.d.ts` sidecars define TypeScript-compatible interfaces without introducing build requirements
- `public-api.mjs` exports only the documented surface
- The module does not break existing starter features or hex boundaries

```trace-yaml
work_item:
  id: TPL-079
  type: meta
  title: In-Browser LLM Module
  parent_ref:
  status: done
  module_ref: local-llm
  spec_refs:
    - docs/prd/local-llm.md
    - docs/prd/index.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
  acceptance:
    - LocalLlmPort composes with AiChatPort and adds loadModel, unloadModel, and isModelLoaded lifecycle operations.
    - WebLLM adapter dynamically imports web-llm, checks WebGPU, and conforms to both LocalLlmPort and AiChatPort.
    - Transformers.js adapter dynamically imports @xenova/transformers, checks WASM, and conforms to both LocalLlmPort and AiChatPort.
    - Model cache manager provides cached-model listing, storage estimation, cache clearing, and model config registry.
    - Starter app wires local LLM option into the chat panel with model selection, progress bar, and graceful degradation.
    - All error messages and UI copy use i18n message keys.
    - JSDoc typedefs and .d.ts sidecars follow the established typing pattern.
    - Public API exports only the documented surface.
    - No ML models are bundled; models download at runtime by explicit user action.
```
