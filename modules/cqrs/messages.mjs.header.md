---
fileId: contextrail-template:modules:cqrs:messages
module: modules/cqrs
stability: experimental
steward: cqrs-module
api: Messages
boundedContext: cqrs
summary: i18n message registry for the cqrs module — all user-facing copy lives here.
owns: t, setLocale, getLocale, registerLocale, resetLocale + the cqrs.* key namespace.
boundaries: No runtime logic beyond message lookup and parameter interpolation.
invariants: Every user-facing string in cqrs flows through a key in this file.
notesForLLM: Add new keys here before referencing them from domain / ports / adapters.
specRefs:
  - TPL-001
---

# messages.mjs
