---
fileId: contextrail-template:modules:feature-seams:messages
module: modules/feature-seams
stability: evolving
steward: shared
api: file-local
boundedContext: feature-seams
summary: i18n message registry for the feature-seams module.
owns: All user-facing text for the feature-seams module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the feature-seams module must come from this registry.
notesForLLM: i18n layer for feature-seams. Add new user-facing strings here, not inline in code.
messageKeys:
  - feature-seams.port.invalid_adapter
  - feature-seams.port.missing_method
  - feature-seams.domain.already_registered
  - feature-seams.domain.invalid_state
  - feature-seams.domain.not_registered
linkedDocs: modules/feature-seams/README.md
---

# messages.mjs
