---
fileId: contextrail-template:modules:file:domain:file-utils
module: modules/file
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: file
summary: Human-readable byte-size formatting and unique file tracking ID generation.
owns: formatFileSize() byte-to-string converter and generateFileId() timestamp-based ID factory.
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

# file-utils.mjs
