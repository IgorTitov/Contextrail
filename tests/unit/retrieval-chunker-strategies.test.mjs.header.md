---
fileId: contextrail-template:tests:unit:retrieval-chunker-strategies.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
boundedContext: retrieval
dependsOn:
  - modules/retrieval/public-api.mjs
  - modules/retrieval/domain/chunker.mjs
summary: Prove the sentence and markdown chunker strategies — boundary detection, abbreviation handling, heading hierarchy, metadata, and chunkIndex invariants.
owns: Behavioral proof for createSentenceChunker and createMarkdownChunker including punctuation, abbreviation, and heading-level metadata.
boundaries: Must import only from modules/retrieval/public-api.mjs. Port assertion + character chunker live in retrieval-chunker-port.test.mjs; recursive chunker lives in retrieval-chunker-recursive.test.mjs.
invariants: Empty text must yield an empty array; chunkIndex must be sequential; abbreviations like "Mr." or "Dr." must not split a sentence; markdown chunks must carry headings metadata when applicable.
risks: Heading-detection regressions and abbreviation lists are easy to break silently.
notesForLLM: Strategy-level prose tests live here; keep simple character chunker behavior in the port test file. Use real-world sample sentences with abbreviations to lock the boundary detector.
tests: node --test tests/unit/retrieval-chunker-strategies.test.mjs
linkedDocs: docs/prd/retrieval.md
specRefs:
  - TPL-101
  - TPL-102
  - TPL-218
related:
  - modules/retrieval/domain/chunker.mjs
  - tests/unit/retrieval-chunker-port.test.mjs
  - tests/unit/retrieval-chunker-recursive.test.mjs
allowedDependencies: modules/retrieval/public-api.mjs
---

# retrieval-chunker-strategies.test.mjs
