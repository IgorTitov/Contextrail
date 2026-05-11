---
fileId: contextrail-template:modules:local-llm:domain:README
module: modules/local-llm
stability: evolving
steward: shared
api: Documentation
hexLayer: domain
boundedContext: local-llm
dependsOn: modules/local-llm/domain/model-cache-manager.mjs
owns: "Human-readable orientation for the local-llm domain layer: what the model cache manager does and what browser APIs it wraps."
boundaries: Must not describe port contracts or adapter behaviors; must not duplicate the built-in model registry list already documented in model-cache-manager.mjs.
invariants: Must remain aligned with the ModelCacheManager interface and the actual domain files present in this folder.
risks: Stale documentation here causes agents to miss the injected-dependency test seam pattern when writing tests for the cache manager.
notesForLLM: The cache manager exposes an injected-dependency test seam via _caches and _storage options. In Node tests, inject null or mock objects for both to avoid touching real browser APIs.
tests: tests/unit/local-llm.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-083
related:
  - modules/local-llm/domain/model-cache-manager.mjs
  - modules/local-llm/public-api.mjs
summary: Directory overview for the domain layer of the local-llm module.
---

# README.md
