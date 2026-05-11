---
fileId: contextrail-template:modules:job-queue:messages
module: modules/job-queue
stability: evolving
steward: shared
api: "Messages"
boundedContext: job-queue
summary: i18n message registry for the job-queue module.
owns: i18n message registry for the job-queue module.
boundaries: Stays inside the job-queue bounded context. Do not couple to other modules' internals.
invariants: Bounded to the job-queue module.
notesForLLM: All user-facing copy from this module flows through t(). Add new locales via registerLocale().
specRefs:
  - TPL-001
---

# messages.mjs
