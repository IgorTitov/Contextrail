---
fileId: contextrail-template:tests:unit:retrieval.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: modules/retrieval/public-api.mjs
summary: Prove pure-logic contracts for the retrieval module -- port assertion, chunker, BM25 adapter, vector-local adapter, and augmentPrompt pipeline.
owns: Unit-level proof of retrieval module pure logic -- port assertion, chunker splitting, BM25 scoring, vector cosine similarity, augmentPrompt formatting, and i18n messages.
boundaries: Must only test through public-api.mjs; must not deep-import module internals.
invariants: All adapters must pass assertRetrievalPort; factory calls must be independent; chunker offsets must be accurate.
risks: Mock-drift is minimal since no external libs are involved; all logic is from first principles.
notesForLLM: All retrieval logic is implemented from first principles with no external dependencies. Tests run in Node.js without any browser APIs.
tests: self
linkedDocs: docs/prd/retrieval.md
specRefs:
  - TPL-087
  - TPL-088
  - TPL-089
  - TPL-090
  - TPL-091
  - TPL-092
related:
  - modules/retrieval/public-api.mjs
  - tests/unit/ai-chat.test.mjs
---

# retrieval.test.mjs
