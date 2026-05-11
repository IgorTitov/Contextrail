---
fileId: contextrail-template:modules:local-llm:adapters:transformers-adapter.d
module: modules/local-llm
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: local-llm
dependsOn:
  - modules/local-llm/types.d.ts
  - modules/local-llm/adapters/transformers-adapter.mjs
owns: TypeScript declarations for the Transformers.js adapter factory and its options type.
boundaries: Must mirror transformers-adapter.mjs exactly; must not add options or return types not present in the .mjs source.
invariants: TransformersAdapterOptions must reflect the _importLib and _checkWasm injection points; return type must be LocalLlmPort from types.d.ts.
risks: Drift between this file and transformers-adapter.mjs causes TypeScript consumers to use stale option shapes or incorrect return types.
notesForLLM: Runs entirely in the browser or Node. Model download and warm-up can be slow; cache loaded models through the port contract.
tests: tests/unit/local-llm.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-082
related:
  - modules/local-llm/adapters/transformers-adapter.mjs
  - modules/local-llm/types.d.ts
  - modules/local-llm/public-api.d.ts
summary: Transformers.js adapter for the local-llm module. Runs models in-process via ONNX Runtime.
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

# transformers-adapter.d.ts
