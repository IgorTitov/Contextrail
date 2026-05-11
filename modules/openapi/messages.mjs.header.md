---
fileId: contextrail-template:modules:openapi:messages
module: modules/openapi
stability: evolving
steward: shared
api: file-local
boundedContext: openapi
summary: i18n message registry for the openapi module.
owns: All user-facing text for the openapi module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the openapi module must come from this registry.
notesForLLM: i18n layer for openapi. Add new user-facing strings here, not inline in code.
messageKeys:
  - openapi.port.not_object
  - openapi.port.missing_method
  - openapi.builder.missing_info
  - openapi.builder.invalid_routes
  - openapi.builder.invalid_method
  - openapi.builder.invalid_path
linkedDocs: modules/openapi/README.md
---

# messages.mjs
