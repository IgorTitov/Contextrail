---
fileId: contextrail-template:modules:file:public-api
module: modules/file
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: file
dependsOn:
  - modules/file/ports/file-port.mjs
  - modules/file/domain/file-utils.mjs
  - modules/file/adapters/blob-adapter.mjs
  - modules/file/adapters/file-system-adapter.mjs
summary: Public API facade for the file module — re-exports port assertion, file utilities, and adapter factories.
owns: The single cross-module entry point for the file bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/file.test.mjs
  - tests/contract/file-hex-contract.test.mjs
specRefs:
  - TPL-001
linkedDocs:
  - modules/file/README.md
  - docs/_generated/dependency-graph.json
allowedDependencies:
  - "./domain/*"
  - "./application/*"
  - "./ports/*"
  - "./adapters/*"
  - "./messages.*"
  - "./types.*"
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/ports/**"
  - "modules/<other>/adapters/**"
  - react
  - express
  - fastify
  - "node:*"
exports:
  - assertFilePort
  - createBlobAdapter
  - createFileSystemAdapter
  - detectMimeType
  - formatFileSize
  - generateFileId
  - getExtension
  - getLocale
  - MIME_TYPES
  - registerLocale
  - resetLocale
  - setLocale
  - t
  - validateFile
---

# public-api.mjs

