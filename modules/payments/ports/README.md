<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for payments/ports.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/payments/ports/

Port contracts for the payments module. Defines `PaymentsPort` (createCustomer, createPaymentIntent, confirmPaymentIntent, refund, verifyWebhook, listIntents, clear) and its runtime assertion helper. Adapters live in `../adapters/`.
