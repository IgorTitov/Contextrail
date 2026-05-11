---
fileId: contextrail-template:modules:retrieval:domain:sentence-chunker
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: retrieval
summary: Sentence-boundary chunker that splits text using punctuation detection with abbreviation awareness, then groups sentences up to maxChunkSize.
owns: createSentenceChunker factory; abbreviation-aware sentence boundary detection; sentence grouping into size-bounded chunks with offset metadata.
boundaries: Pure domain logic. No infrastructure dependencies allowed.
invariants: Must remain framework-free and testable in isolation.
allowedDependencies:
  - ./
  - "../ports/*"
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - next
  - electron
  - express
  - fastify
  - vite
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
linkedDocs: modules/retrieval/domain/README.md
---

# sentence-chunker.mjs
