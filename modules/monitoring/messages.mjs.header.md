---
fileId: contextrail-template:modules:monitoring:messages
module: modules/monitoring
stability: evolving
steward: shared
api: "Messages"
boundedContext: monitoring
summary: i18n message registry for the monitoring module.
owns: i18n message registry for the monitoring module.
boundaries: Stays inside the monitoring bounded context. Do not couple to other modules' internals.
invariants: Bounded to the ${name} module.
notesForLLM: All user-facing copy from this module flows through t(). Add new locales via registerLocale().
specRefs:
  - TPL-001
---

# messages.mjs
