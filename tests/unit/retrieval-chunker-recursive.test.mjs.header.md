---
fileId: contextrail-template:tests:unit:retrieval-chunker-recursive.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
boundedContext: retrieval
dependsOn:
  - modules/retrieval/public-api.mjs
  - modules/retrieval/domain/chunker.mjs
summary: Prove the recursive character chunker — separator fallback (paragraph → line → sentence → space) and chunkSize / chunkIndex invariants.
owns: Behavioral proof for createRecursiveCharacterChunker, including custom-separator support and graceful handling of inputs with no obvious split point.
boundaries: Must import only from modules/retrieval/public-api.mjs. Port assertion + character chunker tests live in retrieval-chunker-port.test.mjs; sentence and markdown chunkers live in retrieval-chunker-strategies.test.mjs.
invariants: Empty text must yield an empty array; chunkIndex must be sequential from 0; every chunk's content length must respect chunkSize once the separator fallback narrows enough.
risks: Adding new fallback separators or changing precedence may silently re-glue chunks.
notesForLLM: All imports go through the retrieval public-api. Use small chunkSize values to force fallback behavior; do not introduce real-world prose with abbreviations here — those are covered in retrieval-chunker-strategies.test.mjs.
tests: node --test tests/unit/retrieval-chunker-recursive.test.mjs
linkedDocs: docs/prd/retrieval.md
specRefs:
  - TPL-100
  - TPL-218
related:
  - modules/retrieval/domain/chunker.mjs
  - tests/unit/retrieval-chunker-port.test.mjs
  - tests/unit/retrieval-chunker-strategies.test.mjs
allowedDependencies: modules/retrieval/public-api.mjs
---

# retrieval-chunker-recursive.test.mjs
