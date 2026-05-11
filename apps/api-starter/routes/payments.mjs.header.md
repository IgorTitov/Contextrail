---
fileId: contextrail-template:apps:api-starter:routes:payments
module: apps/api-starter
stability: evolving
steward: shared
api: Route
boundedContext: api-starter
summary: Payments demo routes — exercise createCustomer, createPaymentIntent, confirmPaymentIntent, listIntents.
owns: createCustomerHandler, createIntentHandler, confirmIntentHandler, listIntentsHandler.
boundaries: Uses only the PaymentsPort from ctx. No direct imports from payments/ internals.
invariants: Amounts must be non-negative integer minor units. All i18n copy flows through the module's messages layer.
notesForLLM: Use pm_fail_* paymentMethod ids to demonstrate declined-charge handling.
specRefs:
  - TPL-001
---

# payments.mjs
