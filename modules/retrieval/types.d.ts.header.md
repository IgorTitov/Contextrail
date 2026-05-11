---
fileId: contextrail-template:modules:retrieval:types.d
module: modules/retrieval
stability: evolving
steward: shared
api: module-public
boundedContext: retrieval
owns: Canonical TypeScript interface definitions for all retrieval domain types and public factory signatures; the single authoritative shape for RetrievalPort, ChunkerPort, RetrievalDocument, RetrievalResult, RetrievalChunk, all chunker option interfaces, Chunker, and AugmentPrompt.
boundaries: Must not contain runtime logic. Must not import adapter or port implementation files. Must remain the sole type authority for the retrieval bounded context.
invariants: Interface shapes must remain stable within a minor version; adding a required property or changing a method signature is a breaking change; all adapter and domain files must import types from here; ChunkerPort and Chunker must remain structurally identical so that all four strategy factories satisfy both.
risks: Changing ChunkerPort.chunk() signature here silently invalidates all four chunker factories and every external adapter that implements the port; removing optional fields that callers destructure causes silent undefined access.
notesForLLM: "This is the single type authority for the retrieval module. ChunkerPort and Chunker are structurally identical — both require chunk(text: string, documentId: string): RetrievalChunk[]. RecursiveCharacterChunkerOptions.separators defaults to ['\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n', '\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n', '. ', ' '] at runtime. SentenceChunkerOptions.maxChunkSize and MarkdownChunkerOptions.maxChunkSize default to 512 and 2000 respectively at runtime."
tests:
  - tests/unit/retrieval.test.mjs
  - tests/unit/retrieval-chunker-port.test.mjs
  - tests/contract/retrieval-hex-contract.test.mjs
linkedDocs: docs/prd/retrieval.md
specRefs:
  - TPL-087
  - TPL-092
  - TPL-098
  - TPL-099
  - TPL-100
  - TPL-101
  - TPL-102
related:
  - modules/retrieval/public-api.mjs
  - modules/retrieval/ports/retrieval-port.mjs
  - modules/retrieval/ports/chunker-port.mjs
  - modules/retrieval/domain/chunker.mjs
  - modules/retrieval/domain/augment-prompt.mjs
  - modules/retrieval/adapters/bm25-adapter.mjs
  - modules/retrieval/adapters/vector-local-adapter.mjs
summary: TypeScript type definitions for the retrieval module.
---

# types.d.ts
