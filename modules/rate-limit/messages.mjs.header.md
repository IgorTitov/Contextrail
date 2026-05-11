---
fileId: contextrail-template:modules:rate-limit:messages
module: modules/rate-limit
stability: evolving
steward: shared
api: "Messages"
boundedContext: rate-limit
summary: i18n message registry for the rate-limit module.
owns: i18n message registry for the rate-limit module.
boundaries: Stays inside the rate-limit bounded context. Do not couple to other modules' internals.
invariants: Bounded to the ${name} module.
notesForLLM: All user-facing copy from this module flows through t(). Add new locales via registerLocale().
specRefs:
  - TPL-001
---

# messages.mjs
