---
fileId: contextrail-template:modules:tenancy:messages
module: modules/tenancy
stability: experimental
steward: tenancy-module
api: i18n
boundedContext: tenancy
summary: i18n message registry for the tenancy module — bounded keys for all user-facing copy.
owns: Locale table, t, setLocale, getLocale, registerLocale, resetLocale.
boundaries: Stays inside the tenancy bounded context. Does not reach into other modules.
invariants: Every error thrown from tenancy routes goes through a key here. No bare strings.
notesForLLM: Add new keys alongside the code that throws them; keep the tenancy.* prefix.
specRefs:
  - TPL-001
---

# messages.mjs
