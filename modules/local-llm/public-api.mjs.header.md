---
fileId: contextrail-template:modules:local-llm:public-api
module: modules/local-llm
stability: evolving
steward: shared
api: module-public
hexLayer: application
boundedContext: local-llm
dependsOn:
  - modules/local-llm/ports/local-llm-port.mjs
  - modules/local-llm/adapters/webllm-adapter.mjs
  - modules/local-llm/adapters/transformers-adapter.mjs
  - modules/local-llm/domain/model-cache-manager.mjs
summary: Single entry point for the local-llm bounded module — re-exports assertLocalLlmPort, WebLLM/Transformers adapters, and createModelCacheManager.
owns: The complete and stable external surface of the local-llm module; the boundary enforcing no deep imports from outside consumers.
boundaries: Must not contain business logic. Must not import from other modules' internals. Must not grow to re-export internal helpers not meant for cross-module use.
invariants: All cross-module local-llm imports must go through this file only; removing an export is a breaking change requiring a version bump; exports must remain consistent with the local-llm hex contract test.
risks: Adding an internal export here accidentally broadens the module surface; removing an export silently breaks consumers not caught by contract tests.
notesForLLM: This is the only file external code may import from the local-llm module. Before adding an export here, confirm it belongs to the public surface and is covered by contract tests. App code in apps/starter/local-llm/ imports from this file.
tests: tests/contract/local-llm-hex-contract.test.mjs
linkedDocs:
  - docs/prd/local-llm.md
  - docs/_generated/dependency-graph.json
specRefs:
  - TPL-084
  - TPL-001
related:
  - modules/local-llm/ports/local-llm-port.mjs
  - tests/contract/local-llm-hex-contract.test.mjs
  - apps/starter/local-llm/local-llm-init.mjs
allowedDependencies:
  - "./domain/*"
  - "./application/*"
  - "./ports/*"
  - "./adapters/*"
  - "./messages.*"
  - "./types.*"
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/ports/**"
  - "modules/<other>/adapters/**"
  - react
  - express
  - fastify
  - "node:*"
exports:
  - assertLocalLlmPort
  - createModelCacheManager
  - createTransformersAdapter
  - createWebLlmAdapter
  - getLocale
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

