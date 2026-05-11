<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for payments/adapters.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/payments/adapters/

Adapter implementations of `PaymentsPort`. Ships one zero-dependency in-memory adapter for tests and the api-starter demo. Real provider adapters (Stripe, Adyen, Braintree, Lemon Squeezy) should implement the same port and be swapped in at composition time.
