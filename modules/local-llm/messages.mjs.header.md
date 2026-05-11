---
fileId: contextrail-template:modules:local-llm:messages
module: modules/local-llm
stability: evolving
steward: shared
api: file-local
boundedContext: local-llm
owns: Bounded i18n locale store for local-llm error and status strings; t(), setLocale(), getLocale(), registerLocale(), and resetLocale() functions; canonical key namespace local-llm.*.
boundaries: Must not import from adapters or ports. Must not be shared with the app-level messages layer in apps/starter/local-llm/messages.mjs — the two are intentionally separate. Must not grow beyond module-internal copy needs.
invariants: All user-facing strings produced by adapters and the model cache manager must go through t() rather than hardcoded literals; resetLocale() must return to 'en'; t() must return the key itself for unknown keys rather than throwing.
risks: Removing or renaming a key here without updating adapter usages causes runtime key-passthrough instead of a localized message, which is silent and hard to detect in testing.
notesForLLM: This is the module-level messages layer — separate from the app-level one in apps/starter/local-llm/messages.mjs. Adapters and the cache manager call t() from this file. The key namespace is local-llm.error.*, local-llm.status.*, and local-llm.progress.*.
tests: tests/unit/local-llm.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-080
related:
  - modules/local-llm/adapters/webllm-adapter.mjs
  - modules/local-llm/adapters/transformers-adapter.mjs
  - modules/local-llm/domain/model-cache-manager.mjs
  - apps/starter/local-llm/messages.mjs
summary: i18n message registry for the local-llm module.
messageKeys:
  - local-llm.error.no_model
  - local-llm.error.load_failed
  - local-llm.error.webgpu_unavailable
  - local-llm.error.wasm_unavailable
  - local-llm.error.send_failed
  - local-llm.error.stream_failed
  - local-llm.error.storage_unavailable
  - local-llm.error.cache_clear_failed
  - local-llm.status.downloading
  - local-llm.status.initializing
  - local-llm.status.ready
  - local-llm.status.unloading
  - local-llm.progress.download
  - local-llm.progress.init
---

# messages.mjs
