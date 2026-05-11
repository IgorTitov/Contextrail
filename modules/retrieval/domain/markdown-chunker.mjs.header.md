---
fileId: contextrail-template:modules:retrieval:domain:markdown-chunker
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: retrieval
summary: Markdown-aware chunker that splits text by heading boundaries, preserving heading hierarchy and section titles in chunk metadata.
owns: createMarkdownChunker factory; heading-level regex parsing; section extraction with hierarchy-aware metadata; maxChunkSize enforcement per section.
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

# markdown-chunker.mjs
