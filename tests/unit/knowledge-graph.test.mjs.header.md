---
fileId: contextrail-template:tests:unit:knowledge-graph.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn:
  - modules/knowledge-graph/public-api.mjs
  - node:test
  - node:assert
summary: Unit-test the knowledge-graph hex module's port assertions, memory adapter, entity and relationship extractors, BFS traversal, and connected-component detection via its public-api.mjs surface.
owns: "Unit-test coverage for the knowledge-graph hex module: port assertions, memory graph adapter, regex entity extractor, co-occurrence relationship extractor, BFS traversal, and connected-component detection."
boundaries: Must test only the public-api.mjs surface; must not import internal adapters or domain files directly; must not require a running database or external service.
invariants: All adapters under test satisfy the relevant port assertion without throwing; graph traversal tests use fixed small graphs with deterministic expected outputs.
risks: If public-api.mjs export names change, tests fail with import errors rather than assertion errors, making the breakage less obvious.
securityPrivacy: In-memory only; no network or file I/O.
notesForLLM: Covers assertGraphStorePort, assertEntityExtractorPort, assertRelationshipExtractorPort, createMemoryGraphAdapter, createRegexEntityExtractor, createCooccurrenceRelationshipExtractor, bfsTraverse, and findConnectedComponents. All fixtures are inline literals.
tests: node --test tests/unit/knowledge-graph.test.mjs
linkedDocs:
  - modules/knowledge-graph/
  - docs/backlog/rag-extensions.md
specRefs:
  - TPL-114
  - TPL-115
  - TPL-116
  - TPL-117
  - TPL-118
  - TPL-119
  - TPL-120
related: modules/knowledge-graph/public-api.mjs
---

# knowledge-graph.test.mjs
