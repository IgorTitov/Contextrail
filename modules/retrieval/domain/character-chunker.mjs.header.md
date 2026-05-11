---
fileId: contextrail-template:modules:retrieval:domain:character-chunker
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: retrieval
summary: Fixed-size sliding-window chunker that splits text into overlapping character-level chunks with configurable chunkSize and chunkOverlap.
owns: createCharacterChunker factory and the backward-compatible createChunker alias; offset tracking and RetrievalChunk metadata generation for each window.
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

# character-chunker.mjs
