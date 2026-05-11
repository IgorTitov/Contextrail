---
fileId: contextrail-template:modules:local-llm:messages.d
module: modules/local-llm
stability: evolving
steward: shared
api: file-local
boundedContext: local-llm
dependsOn: modules/local-llm/messages.mjs
owns: TypeScript declarations for the local-llm i18n API surface.
boundaries: Must mirror messages.mjs exactly; must not declare types not present in the .mjs source.
invariants: Function signatures must remain consistent with the runtime messages.mjs implementation.
risks: Drift between this file and messages.mjs causes TypeScript consumers to call t() with incorrect param shapes.
notesForLLM: Keep in sync with messages.mjs. The params argument to t() is a Record<string, string | number> for template substitution.
tests: tests/unit/local-llm.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-080
related:
  - modules/local-llm/messages.mjs
  - modules/local-llm/adapters/webllm-adapter.d.ts
  - modules/local-llm/adapters/transformers-adapter.d.ts
summary: Messages.D implementation for the local-llm module.
---

# messages.d.ts
