---
fileId: contextrail-template:modules:file:domain:file-validation
module: modules/file
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: file
summary: Validates files against size, extension, and MIME type constraints using the i18n messages layer for error text.
owns: validateFile() that checks maxSize, allowedExtensions, and allowedMimeTypes and returns {valid, errors}.
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

# file-validation.mjs
