---
fileId: contextrail-template:modules:local-llm:domain:model-cache-manager
module: modules/local-llm
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: local-llm
dependsOn: modules/local-llm/messages.mjs
owns: createModelCacheManager factory; built-in model registry (MODEL_REGISTRY) with WebLLM and Transformers.js configs; browser Cache API and navigator.storage interactions for model cache enumeration, presence checks, storage estimates, and selective cache deletion.
boundaries: Must not contain adapter lifecycle logic (loadModel, unloadModel). Must not be called directly from outside the local-llm module — accessed only through public-api.mjs. Must remain framework-free with no network calls beyond what browser APIs perform internally.
invariants: getAvailableModels must return a defensive copy of MODEL_REGISTRY; getCachedModels must return a defensive copy; clearModelCache must throw a localized error on cache deletion failure; all operations must degrade gracefully when the Cache API or navigator.storage is unavailable.
risks: If _caches or _storage are not injected in tests, real browser APIs are silently bypassed via null fallback — tests relying on cache state must inject mock implementations; clearModelCache without a modelId clears all caches, which is destructive if called inadvertently.
notesForLLM: Inject _caches and _storage in tests. getAvailableModels returns the built-in registry for UI model selection. clearModelCache(undefined) clears all model caches. Storage estimate returns zeros when navigator.storage is unavailable — this is expected and must not throw.
externalSystems: browser Cache API (globalThis.caches); browser Storage API (navigator.storage)
tests: tests/unit/local-llm.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-083
related:
  - modules/local-llm/public-api.mjs
  - modules/local-llm/messages.mjs
  - modules/local-llm/ports/local-llm-port.mjs
allowedDependencies: modules/local-llm/messages.mjs
summary: Manages browser-cached LLM models via the Cache API, providing a built-in model registry, cache enumeration, storage estimation, and selective cache deletion.
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

# model-cache-manager.mjs
