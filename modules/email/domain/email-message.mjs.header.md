---
fileId: contextrail-template:modules:email:email-message
module: modules/email
stability: evolving
steward: shared
api: Domain
boundedContext: email
summary: Pure email-message domain — address validation, recipient normalization, message construction.
owns: createEmailMessage, isValidEmailAddress, assertEmailAddress, normalizeRecipients, recipientCount.
boundaries: Stays inside the email bounded context. No I/O, no timers, no imports from adapters/.
invariants: Pure functions only. All errors use i18n keys from messages.mjs.
notesForLLM: Domain stays framework-free. Do not import from adapters/ or infrastructure.
specRefs:
  - TPL-001
---

# email-message.mjs
