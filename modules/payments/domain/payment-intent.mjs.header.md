---
fileId: contextrail-template:modules:payments:payment-intent
module: modules/payments
stability: evolving
steward: shared
api: Domain
boundedContext: payments
summary: Pure payment-intent domain — input validation and state-machine transitions.
owns: validatePaymentIntentInput, nextConfirmStatus, nextRefundState, PaymentIntentStatus typedef.
boundaries: Stays inside the payments bounded context. No I/O, no clock, no id generation.
invariants: State transitions only follow the documented machine. Refunds cannot exceed the original amount.
notesForLLM: Payment methods starting with "pm_fail" deterministically simulate declined charges for tests.
specRefs:
  - TPL-001
---

# payment-intent.mjs
