---
fileId: contextrail-template:tests:contract:ai-chat-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
dependsOn: modules/ai-chat/public-api.mjs
summary: "Verify that the ai-chat module satisfies its hexagonal contract: correct folder layout, required public-api exports, and no deep import violations."
owns: Structural and surface compliance verification for the ai-chat module's hexagonal boundaries; export-list assertions against expected public surface.
boundaries: Must not test business logic or adapter behavior — that belongs in unit tests. Must not import ai-chat module internals directly.
invariants: Contract test must fail if any expected export is removed from public-api.mjs; test must be re-run whenever the public API surface changes.
risks: Contract tests that only check file existence without validating exports can miss removed public symbols.
notesForLLM: This test validates structure, not behavior. When adding a new public export to ai-chat/public-api.mjs, add a corresponding assertion here.
tests: self
linkedDocs: docs/prd/ai-chat.md
specRefs:
  - TPL-071
  - TPL-072
  - TPL-076
related:
  - modules/ai-chat/public-api.mjs
  - tests/unit/ai-chat.test.mjs
---

# ai-chat-hex-contract.test.mjs
