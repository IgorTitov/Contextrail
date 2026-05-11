---
fileId: contextrail-template:modules:form-validation:messages
module: modules/form-validation
stability: evolving
steward: shared
api: file-local
boundedContext: form-validation
summary: i18n message registry for the form-validation module.
owns: All user-facing text for the form-validation module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the form-validation module must come from this registry.
notesForLLM: i18n layer for form-validation. Add new user-facing strings here, not inline in code.
messageKeys:
  - validation.required
  - validation.min_length
  - validation.max_length
  - validation.pattern
  - validation.email
  - validation.matches
linkedDocs: modules/form-validation/README.md
---

# messages.mjs
