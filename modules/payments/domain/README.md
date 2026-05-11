<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for payments/domain.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/payments/domain/

Pure domain logic for the payments module. Framework-free, no network, no persistence. Contains money arithmetic (integer minor units + ISO-4217), payment-intent state transitions, and HMAC-SHA256 webhook signature verification.
