---
fileId: contextrail-template:tests:unit:retrieval-chunker-port.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
boundedContext: retrieval
dependsOn:
  - modules/retrieval/public-api.mjs
  - modules/retrieval/ports/chunker-port.mjs
  - modules/retrieval/domain/chunker.mjs
summary: Prove the ChunkerPort contract validator and the simple character chunker (plus its createChunker backward-compat alias).
owns: Acceptance proof for assertChunkerPort correctness and createCharacterChunker behavior; regression guard for ChunkerPort compliance entry-points.
boundaries: Must only import from the retrieval public-api. Must not test internal implementation details beyond observable behavior. Recursive chunker tests live in retrieval-chunker-recursive.test.mjs; sentence and markdown tests live in retrieval-chunker-strategies.test.mjs.
invariants: All chunker factories produced by the retrieval module must pass assertChunkerPort without throwing; empty text must always yield an empty array; chunkIndex must be sequential from 0.
risks: Removing port-contract tests here would break the cross-strategy ChunkerPort guarantee.
notesForLLM: Tests import exclusively from the public-api barrel. Port contract + character chunker live here; other chunker strategies live in sibling retrieval-chunker-*.test.mjs files.
tests: node --test tests/unit/retrieval-chunker-port.test.mjs
linkedDocs: docs/prd/retrieval.md
specRefs:
  - TPL-098
  - TPL-099
  - TPL-218
related:
  - modules/retrieval/ports/chunker-port.mjs
  - modules/retrieval/domain/chunker.mjs
  - tests/unit/retrieval-chunker-recursive.test.mjs
  - tests/unit/retrieval-chunker-strategies.test.mjs
  - tests/unit/retrieval.test.mjs
allowedDependencies: modules/retrieval/public-api.mjs
---

# retrieval-chunker-port.test.mjs
