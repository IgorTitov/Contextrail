---
fileId: contextrail-template:tests:unit:retrieval-hybrid-reranker.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn:
  - modules/retrieval/public-api.mjs
  - node:test
  - node:assert
summary: Unit-test the hybrid search adapters (RRF and weighted) and score-threshold re-ranker in the retrieval hex module using fake in-memory retrieval backends.
owns: Unit-test coverage for HybridSearchAdapter (RRF), WeightedHybridAdapter, ReRankerPort assertion, and ScoreThresholdReRanker in the retrieval hex module.
boundaries: Must test only the public-api.mjs surface; must not construct internal adapter instances directly; must not require a vector store, embedding service, or network.
invariants: Fake retrieval adapters used in tests satisfy assertRetrievalPort; score and rank ordering assertions use deterministic fixture inputs; score threshold tests confirm exact result counts.
risks: RRF rank fusion output depends on result ordering from both backends; fixture-level bugs can make false positives if both fake adapters return the same document IDs.
securityPrivacy: In-memory only; no network or file I/O.
notesForLLM: Tests assertRetrievalPort, assertReRankerPort, createHybridSearchAdapter, createWeightedHybridAdapter, and createScoreThresholdReRanker. Fake retrieval adapters are defined inline using makeFakeRetrieval helper.
tests: node --test tests/unit/retrieval-hybrid-reranker.test.mjs
linkedDocs:
  - modules/retrieval/
  - docs/backlog/rag-extensions.md
specRefs:
  - TPL-110
  - TPL-111
  - TPL-112
  - TPL-113
related: modules/retrieval/public-api.mjs
---

# retrieval-hybrid-reranker.test.mjs
