---
fileId: contextrail-template:tests:unit:file.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the file module.
owns: Unit proof of file module domain logic (detectMimeType, getExtension, validateFile, formatFileSize, generateFileId), port contract validation (assertFilePort), and adapter correctness (FileSystem and Blob adapters).
boundaries: Must import only through modules/file/public-api.mjs; must not reach into module internals; filesystem tests use os.tmpdir() and must clean up after themselves; Blob adapter tests must not assume a browser environment.
invariants: All imports must go through public-api.mjs; assertFilePort must throw on any adapter with missing required methods; temporary files created during tests must be removed in afterEach or equivalent cleanup.
risks: Uncleaned tmpdir files can accumulate across test runs if cleanup logic is skipped on early exits.
notesForLLM: Import exclusively via public-api.mjs. Filesystem adapter tests write to os.tmpdir() — always pair writeFile with explicit cleanup. MIME_TYPES is a constant map; test coverage should include both recognised and unknown extensions.
tests:
  - node:test runner via pnpm test:unit
  - SpecRefs TPL-160, TPL-161, TPL-162
specRefs:
  - TPL-160
  - TPL-161
  - TPL-162
related: tests/contract/file-hex-contract.test.mjs
---

# file.test.mjs
