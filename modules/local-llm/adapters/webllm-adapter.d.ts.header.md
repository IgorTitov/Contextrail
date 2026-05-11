---
fileId: contextrail-template:modules:local-llm:adapters:webllm-adapter.d
module: modules/local-llm
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: local-llm
dependsOn:
  - modules/local-llm/types.d.ts
  - modules/local-llm/adapters/webllm-adapter.mjs
owns: TypeScript declarations for the WebLLM adapter factory and its options type.
boundaries: Must mirror webllm-adapter.mjs exactly; must not add options or return types not present in the .mjs source.
invariants: WebLlmAdapterOptions must reflect the _importLib and _checkWebGPU injection points; return type must be LocalLlmPort from types.d.ts.
risks: Drift between this file and webllm-adapter.mjs causes TypeScript consumers to use stale option shapes or incorrect return types.
notesForLLM: Browser-only; requires WebGPU. First-run download of weights is large — warn users or pre-fetch through the port contract.
tests: tests/unit/local-llm.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-081
related:
  - modules/local-llm/adapters/webllm-adapter.mjs
  - modules/local-llm/types.d.ts
  - modules/local-llm/public-api.d.ts
summary: WebLLM browser adapter for the local-llm module. Runs LLMs locally on WebGPU.
allowedDependencies:
  - "../ports/*"
  - "../types.*"
  - ./
  - "frameworks as needed (react, express, node: builtins)"
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: infrastructure
---

# webllm-adapter.d.ts
