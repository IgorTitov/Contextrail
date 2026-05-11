---
fileId: contextrail-template:tests:unit:payments
module: tests/unit
stability: evolving
steward: shared
api: Test
boundedContext: payments
summary: Unit proof for the payments bounded module — money, intent state machine, webhook verify, memory adapter.
owns: Node test suite covering createMoney, validatePaymentIntentInput, verifyWebhookSignature, and memory adapter flows.
boundaries: Imports only from modules/payments/public-api.mjs. No deep imports.
invariants: Every new public export of payments must be proven here.
notesForLLM: Use node:crypto in tests for deterministic HMAC fixtures. Inject a fake clock for webhook timestamp tests.
specRefs:
  - TPL-001
---

# payments.test.mjs
