---
fileId: contextrail-template:modules:file:messages
module: modules/file
stability: evolving
steward: shared
api: file-local
boundedContext: file
summary: i18n message registry for the file module.
owns: All user-facing text for the file module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the file module must come from this registry.
notesForLLM: i18n layer for file. Add new user-facing strings here, not inline in code.
messageKeys:
  - file.port.must_be_object
  - file.port.missing_method
  - file.validation.too_large
  - file.validation.invalid_mime
  - file.validation.invalid_extension
  - file.upload.failed
  - file.download.failed
  - file.read.failed
  - file.fs.browser_unsupported
  - file.fs.base_path_required
  - file.fs.not_found
linkedDocs: modules/file/README.md
---

# messages.mjs
