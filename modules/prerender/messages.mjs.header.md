---
fileId: contextrail-template:modules:prerender:messages
module: modules/prerender
stability: experimental
steward: prerender-module
api: Messages
boundedContext: prerender
summary: Bounded i18n message registry for the prerender module.
owns: All prerender.* i18n keys and the t/setLocale/getLocale/registerLocale/resetLocale helpers.
boundaries: Messages only. No domain logic.
invariants: Every user-facing copy string from prerender must go through this file.
specRefs:
  - TPL-001
---

# messages.mjs
