---
fileId: contextrail-template:modules:payments:payments-port
module: modules/payments
stability: evolving
steward: shared
api: Port
boundedContext: payments
summary: Port contract for payment provider adapters (customers, intents, refunds, webhooks).
owns: PaymentsPort typedef and assertPaymentsPort runtime validator.
boundaries: Defines the seam between domain and infrastructure. No provider-specific logic.
invariants: Contract is stable — changes require a capability-sync rerun and adapter migration.
notesForLLM: Add new methods only via capability-sync; update assertPaymentsPort in lockstep with the typedef.
specRefs:
  - TPL-001
---

# payments-port.mjs
