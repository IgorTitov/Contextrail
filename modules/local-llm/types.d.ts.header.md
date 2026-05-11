---
fileId: contextrail-template:modules:local-llm:types.d
module: modules/local-llm
stability: evolving
steward: shared
api: module-public
boundedContext: local-llm
owns: "Canonical TypeScript type source for all local-llm module interfaces: port shapes, model config, progress reporting, and cache manager contract; re-exports of AiChat types used by the port."
boundaries: Must not contain implementation logic. Must not import from adapter or domain files. Must remain the single source of type truth for all local-llm sidecar .d.ts files.
invariants: LocalLlmPort must extend AiChatPort; all sidecar .d.ts files in the module must reference types from this file rather than declaring their own; removing or narrowing an exported type is a breaking change.
risks: Changing type shapes here silently breaks all TypeScript consumers not caught by contract tests; adding types without updating relevant sidecar files creates inconsistencies that only surface during TypeScript compilation.
notesForLLM: This is the single type authority for the local-llm module. All .d.ts sidecar files reference types from here. LocalLlmPort extends AiChatPort from modules/ai-chat/types.d.ts. LocalLlmProgress.progress is normalized 0–1 (not 0–100).
tests: tests/contract/local-llm-hex-contract.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs:
  - TPL-080
  - TPL-084
related:
  - modules/local-llm/public-api.d.ts
  - modules/local-llm/ports/local-llm-port.d.ts
  - modules/local-llm/adapters/webllm-adapter.d.ts
  - modules/local-llm/adapters/transformers-adapter.d.ts
  - modules/local-llm/domain/model-cache-manager.d.ts
  - modules/ai-chat/types.d.ts
summary: TypeScript type definitions for the local-llm module.
---

# types.d.ts
