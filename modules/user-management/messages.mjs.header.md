---
fileId: contextrail-template:modules:user-management:messages
module: modules/user-management
stability: evolving
steward: shared
api: "Messages"
boundedContext: user-management
summary: i18n message registry for the user-management module.
owns: i18n message registry for the user-management module.
boundaries: Stays inside the user-management bounded context. Do not couple to other modules' internals.
invariants: Bounded to the ${name} module.
notesForLLM: All user-facing copy from this module flows through t(). Add new locales via registerLocale().
specRefs:
  - TPL-001
---

# messages.mjs
