---
fileId: contextrail-template:apps:starter:local-llm:local-llm-panel
module: apps/starter
stability: evolving
steward: shared
api: file-local
dependsOn:
  - apps/starter/local-llm/ui-selectors.mjs
  - apps/starter/local-llm/messages.mjs
  - modules/local-llm/public-api.mjs
owns: createLocalLlmPanel factory; vanilla JS DOM construction for the panel with model selector, load button, progress bar, status indicator, storage display, and clear cache button; capability detection gating; model lifecycle orchestration via injected cacheManager and createAdapter.
boundaries: Must not import the adapter directly — adapter creation is delegated via the injected createAdapter callback. Must not use a framework. Must not hardcode data-testid strings — all selectors come from ui-selectors.mjs. Must not hardcode UI copy — all strings come from messages.mjs.
invariants: All data-testid attribute values must come from ui-selectors.mjs; all user-visible text must come from t() in messages.mjs; panel must show capability warning and no controls when both WebGPU and WASM are unavailable; destroy() must unload any loaded model.
risks: Hardcoded selectors or copy strings here break the single source of truth for tests and i18n; failing to call onModelReady after a successful load silently prevents adapter swap in the host app; not cleaning up event listeners on destroy() can cause memory leaks in long-running pages.
notesForLLM: The factory receives cacheManager, createAdapter, checkWebGPU, and checkWasm as injected dependencies — this is the test seam. getAdapter() returns null until a model finishes loading. Backend filtering (webllm vs transformers) happens in the selector loop based on capability checks.
tests: tests/unit/local-llm-ui.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-085
related:
  - apps/starter/local-llm/local-llm-init.mjs
  - apps/starter/local-llm/ui-selectors.mjs
  - apps/starter/local-llm/messages.mjs
  - apps/starter/local-llm/local-llm-panel.css
summary: Local Llm Panel for the starter app.
---

# local-llm-panel.mjs
