---
fileId: contextrail-template:modules:onboarding:messages
module: modules/onboarding
stability: evolving
steward: shared
api: file-local
boundedContext: onboarding
summary: i18n message registry for the onboarding module.
owns: All user-facing text for the onboarding module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the onboarding module must come from this registry.
notesForLLM: i18n layer for onboarding. Add new user-facing strings here, not inline in code.
messageKeys:
  - onboarding.port.invalid_adapter
  - onboarding.port.missing_method
  - onboarding.btn.next
  - onboarding.btn.back
  - onboarding.btn.done
  - onboarding.btn.close_label
  - onboarding.counter
  - onboarding.dialog_label
linkedDocs: modules/onboarding/README.md
---

# messages.mjs
