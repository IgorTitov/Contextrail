---
fileId: contextrail-template:modules:local-llm:domain:model-cache-manager.d
module: modules/local-llm
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: local-llm
dependsOn:
  - modules/local-llm/types.d.ts
  - modules/local-llm/domain/model-cache-manager.mjs
owns: TypeScript declarations for the model cache manager factory and its options type.
boundaries: Must mirror model-cache-manager.mjs exactly; must not add options or return types not present in the .mjs source.
invariants: ModelCacheManagerOptions must reflect the _caches and _storage injection fields; return type must be ModelCacheManager from types.d.ts.
risks: Drift between this file and model-cache-manager.mjs causes TypeScript consumers to miss the injection seam pattern needed for testing.
notesForLLM: Keep in sync with model-cache-manager.mjs. The _caches and _storage fields are test-only injection seams. Return type comes from ModelCacheManager in types.d.ts.
tests: tests/unit/local-llm.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-083
related:
  - modules/local-llm/domain/model-cache-manager.mjs
  - modules/local-llm/types.d.ts
  - modules/local-llm/public-api.d.ts
summary: Model Cache Manager.D implementation for the local-llm module.
allowedDependencies:
  - ./
  - "../ports/*"
  - "../types.*"
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

# model-cache-manager.d.ts
