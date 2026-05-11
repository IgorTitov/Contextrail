---
fileId: contextrail-template:modules:local-llm:public-api.d
module: modules/local-llm
stability: evolving
steward: shared
api: module-public
hexLayer: application
boundedContext: local-llm
dependsOn:
  - modules/local-llm/ports/local-llm-port.d.ts
  - modules/local-llm/adapters/webllm-adapter.d.ts
  - modules/local-llm/adapters/transformers-adapter.d.ts
  - modules/local-llm/domain/model-cache-manager.d.ts
  - modules/local-llm/types.d.ts
owns: The TypeScript surface for external consumers of the local-llm module; mirrors the runtime surface of public-api.mjs exactly.
boundaries: Must not declare types not exported by public-api.mjs; must not import from other modules' .d.ts files directly — types re-exported here come only from local-llm's own type files.
invariants: Must remain in sync with public-api.mjs; every export in public-api.mjs must have a corresponding declaration here; type exports must come from types.d.ts.
risks: Adding a new export to public-api.mjs without updating this file silently breaks TypeScript consumers; exporting types from non-canonical sources creates drift from the single type authority in types.d.ts.
notesForLLM: This file must mirror public-api.mjs. Any new export added to the .mjs file needs a matching declaration here. All types come from types.d.ts via re-export.
tests: tests/contract/local-llm-hex-contract.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-084
related:
  - modules/local-llm/public-api.mjs
  - modules/local-llm/types.d.ts
  - tests/contract/local-llm-hex-contract.test.mjs
summary: Public Api.D implementation for the local-llm module.
---

# public-api.d.ts
