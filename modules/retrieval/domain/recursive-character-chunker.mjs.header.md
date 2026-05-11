---
fileId: contextrail-template:modules:retrieval:domain:recursive-character-chunker
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: retrieval
summary: Recursive chunker that splits text using a hierarchy of separators (paragraph, line, sentence, word), falling back to the next separator when a chunk exceeds the target size.
owns: createRecursiveCharacterChunker factory; recursive separator-hierarchy splitting with hard-cut fallback; RetrievalChunk metadata generation.
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

# recursive-character-chunker.mjs
