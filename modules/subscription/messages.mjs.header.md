---
fileId: contextrail-template:modules:subscription:messages
module: modules/subscription
stability: evolving
steward: shared
api: "Messages"
boundedContext: subscription
summary: i18n message registry for the subscription module.
owns: i18n message registry for the subscription module.
boundaries: Stays inside the subscription bounded context. Do not couple to other modules' internals.
invariants: Bounded to the ${name} module.
notesForLLM: All user-facing copy from this module flows through t(). Add new locales via registerLocale().
specRefs:
  - TPL-001
---

# messages.mjs
