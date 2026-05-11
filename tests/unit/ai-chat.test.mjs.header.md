---
fileId: contextrail-template:tests:unit:ai-chat.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: modules/ai-chat/public-api.mjs
summary: Prove the behavioral contracts of all ai-chat module components — port assertion, echo adapter, http-api adapter, and message history — using only the public API.
owns: Unit-level behavioral coverage for all ai-chat module exports; regression protection for adapter contracts, streaming, history management, and listener notifications.
boundaries: Must import only through modules/ai-chat/public-api.mjs — no deep imports into ai-chat internals. Must not perform real network calls.
invariants: All tests must pass with no external service dependencies; tests must not share mutable state across cases; each adapter must be tested in isolation.
risks: Deep imports into ai-chat internals would couple tests to implementation details; shared state between test cases can cause order-dependent flakiness.
notesForLLM: All ai-chat imports must go through public-api.mjs. Use mock ApiClientPort when testing http-api adapter. Check both success and error paths.
tests: self
linkedDocs: docs/prd/ai-chat.md
specRefs:
  - TPL-072
  - TPL-073
  - TPL-074
  - TPL-075
related:
  - modules/ai-chat/public-api.mjs
  - tests/contract/ai-chat-hex-contract.test.mjs
---

# ai-chat.test.mjs
