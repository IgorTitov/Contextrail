---
fileId: contextrail-template:modules:state:messages
module: modules/state
stability: evolving
steward: shared
api: file-local
boundedContext: state
summary: i18n message registry for the state module.
owns: All user-facing text for the state module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the state module must come from this registry.
notesForLLM: i18n layer for state. Add new user-facing strings here, not inline in code.
messageKeys:
  - state.port.invalid_adapter
  - state.port.missing_method
linkedDocs: modules/state/README.md
---

# messages.mjs
