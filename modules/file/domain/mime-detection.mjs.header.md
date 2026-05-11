---
fileId: contextrail-template:modules:file:domain:mime-detection
module: modules/file
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: file
summary: Extension-based MIME type lookup from a static map covering images, documents, archives, and media.
owns: MIME_TYPES constant map, getExtension() filename parser, and detectMimeType() resolver with octet-stream fallback.
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
linkedDocs: modules/file/domain/README.md
---

# mime-detection.mjs
