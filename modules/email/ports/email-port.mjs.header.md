---
fileId: contextrail-template:modules:email:email-port
module: modules/email
stability: evolving
steward: shared
api: Port
boundedContext: email
summary: Port contract for outbound email adapters (memory, console, SMTP, HTTP APIs).
owns: EmailPort typedef and assertEmailPort runtime validator.
boundaries: Defines the seam between domain and infrastructure. No adapter-specific logic.
invariants: Contract is stable — changes require a capability-sync rerun and adapter migration.
notesForLLM: Add new methods only via capability-sync; update assertEmailPort in lockstep with the typedef.
specRefs:
  - TPL-001
---

# email-port.mjs
