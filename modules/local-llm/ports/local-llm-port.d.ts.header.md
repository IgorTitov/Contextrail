---
fileId: contextrail-template:modules:local-llm:ports:local-llm-port.d
module: modules/local-llm
stability: evolving
steward: shared
api: module-public
hexLayer: port
portType: inbound
boundedContext: local-llm
dependsOn:
  - modules/local-llm/types.d.ts
  - modules/local-llm/ports/local-llm-port.mjs
owns: TypeScript declarations for the local-llm port interface and its validator function.
boundaries: Must mirror local-llm-port.mjs exactly; must not add types not present in the .mjs source; must not contain implementation logic.
invariants: Type signatures must remain consistent with the runtime assertLocalLlmPort implementation; types re-exported here must exist in types.d.ts.
risks: Drift between this file and local-llm-port.mjs causes TypeScript consumers to rely on types that differ from the runtime contract.
notesForLLM: Keep in sync with local-llm-port.mjs. Type sources come from types.d.ts. Do not add new types here without adding them in types.d.ts first.
tests:
  - tests/unit/local-llm.test.mjs
  - tests/contract/local-llm-hex-contract.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-080
related:
  - modules/local-llm/ports/local-llm-port.mjs
  - modules/local-llm/types.d.ts
  - modules/local-llm/public-api.d.ts
summary: Local Llm Port.D port for the local-llm module.
allowedDependencies:
  - ./
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - express
  - fastify
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
portCategory: llm
contractTests: tests/contract/local-llm-hex-contract.test.mjs
---

# local-llm-port.d.ts
