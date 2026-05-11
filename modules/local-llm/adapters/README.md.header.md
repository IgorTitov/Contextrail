---
fileId: contextrail-template:modules:local-llm:adapters:README
module: modules/local-llm
stability: evolving
steward: shared
api: Documentation
hexLayer: adapter
boundedContext: local-llm
dependsOn:
  - modules/local-llm/adapters/webllm-adapter.mjs
  - modules/local-llm/adapters/transformers-adapter.mjs
owns: "Human-readable orientation for the local-llm adapters layer: which adapters exist, which backends they wrap, and how they are tested without real ML runtimes."
boundaries: Must not duplicate adapter implementation details; must not describe port contracts already documented in ports/README.md.
invariants: Must remain aligned with the actual adapter files present in this folder; must note the injected-dependency test seam pattern for both adapters.
risks: Stale adapter list here causes agents to implement duplicate or conflicting adapters instead of extending existing ones.
notesForLLM: Both adapters use dynamic import(_importLib) and a capability check (_checkWebGPU / _checkWasm) that can be injected for testing without real browser APIs. Each factory call produces an isolated instance.
tests: tests/unit/local-llm.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs:
  - TPL-081
  - TPL-082
related:
  - modules/local-llm/adapters/webllm-adapter.mjs
  - modules/local-llm/adapters/transformers-adapter.mjs
  - modules/local-llm/ports/local-llm-port.mjs
summary: Directory overview for the adapters layer of the local-llm module.
---

# README.md
