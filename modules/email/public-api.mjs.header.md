---
fileId: contextrail-template:modules:email:public-api
module: modules/email
stability: evolving
steward: shared
api: Public API
boundedContext: email
summary: Single cross-module entry point for the email module.
owns: Re-exports of domain, port assertion, adapters, and messages.
boundaries: Only file in modules/email other modules may import. Deep imports into domain/ports/adapters are forbidden.
invariants: Every export is stable across minor versions. Additions require capability-sync rerun.
notesForLLM: Add new exports here only after they exist in domain/ports/adapters; never inline implementations.
linkedDocs: modules/email/README.md
specRefs:
  - TPL-001
exports:
  - assertEmailAddress
  - assertEmailPort
  - createConsoleEmailAdapter
  - createEmailMessage
  - createMemoryEmailAdapter
  - getLocale
  - isValidEmailAddress
  - normalizeRecipients
  - recipientCount
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs
