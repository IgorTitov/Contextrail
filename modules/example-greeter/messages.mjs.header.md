---
fileId: contextrail-template:modules:example-greeter:messages
module: modules/example-greeter
stability: evolving
steward: shared
api: file-local
boundedContext: example-greeter
summary: i18n message registry for the example-greeter module.
owns: All user-facing text for the example-greeter module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the example-greeter module must come from this registry.
notesForLLM: i18n layer for example-greeter. Add new user-facing strings here, not inline in code.
messageKeys:
  - example-greeter.port.missing_getTemplate
linkedDocs: modules/example-greeter/README.md
---

# messages.mjs
