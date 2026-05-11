---
fileId: contextrail-template:modules:analytics:messages
module: modules/analytics
stability: evolving
steward: shared
api: file-local
boundedContext: analytics
summary: i18n message registry for the analytics module.
owns: All user-facing text for the analytics module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the analytics module must come from this registry.
notesForLLM: i18n layer for analytics. Add new user-facing strings here, not inline in code.
messageKeys:
  - analytics.port.invalid_adapter
  - analytics.port.missing_track
  - analytics.port.missing_identify
  - analytics.port.missing_page
  - analytics.port.missing_setProperties
  - analytics.port.missing_reset
  - analytics.port.missing_getConsent
  - analytics.port.missing_setConsent
  - analytics.consent.denied
  - analytics.consent.dnt_respected
linkedDocs: modules/analytics/README.md
---

# messages.mjs
