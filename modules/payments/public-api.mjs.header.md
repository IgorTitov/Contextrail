---
fileId: contextrail-template:modules:payments:public-api
module: modules/payments
stability: evolving
steward: shared
api: PublicAPI
boundedContext: payments
summary: Single cross-module entry point for the payments module — re-exports domain, port, adapter, messages.
owns: The public surface of the payments module.
boundaries: The only file other modules may import from payments/. Deep imports are forbidden.
invariants: Every export here must be intentionally public. Internal helpers must not leak.
notesForLLM: When adding a new export, update manifest.json capabilities and the README usage examples.
specRefs:
  - TPL-001
exports:
  - addMoney
  - assertPaymentsPort
  - computeSignature
  - createMemoryPaymentsAdapter
  - createMoney
  - formatMoney
  - getLocale
  - nextConfirmStatus
  - nextRefundState
  - nodeCryptoBridge
  - parseSignatureHeader
  - registerLocale
  - resetLocale
  - setLocale
  - subtractMoney
  - t
  - validatePaymentIntentInput
  - verifyWebhookSignature
  - verifyWebhookSignatureWith
---

# public-api.mjs
