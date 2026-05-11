---
fileId: contextrail-template:modules:local-llm:README
module: modules/local-llm
stability: evolving
steward: shared
api: Documentation
boundedContext: local-llm
dependsOn:
  - modules/local-llm/public-api.mjs
  - modules/local-llm/ports/local-llm-port.mjs
  - modules/local-llm/adapters/webllm-adapter.mjs
  - modules/local-llm/adapters/transformers-adapter.mjs
  - modules/local-llm/domain/model-cache-manager.mjs
owns: "Human-readable orientation for the local-llm bounded module: purpose, key exports, and structural layout."
boundaries: Must not duplicate implementation details already clear from file headers; must not describe infrastructure concerns that belong in adapter files.
invariants: Must stay aligned with the actual public-api.mjs exports and module folder structure.
risks: Stale descriptions mislead agents about which adapters or types exist; omitting the no-model-bundle constraint causes incorrect assumptions about bundle size.
notesForLLM: The module's only permitted entry point for external consumers is public-api.mjs. WebLLM requires WebGPU; Transformers.js requires WebAssembly. No ML models are bundled.
tests: tests/contract/local-llm-hex-contract.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-079
related:
  - modules/local-llm/public-api.mjs
  - modules/ai-chat/README.md
summary: Overview and navigation guide for the local-llm hex module.
---

# README.md
