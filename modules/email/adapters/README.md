<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for email/adapters.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/email/adapters/

EmailPort implementations for the email module. Memory adapter captures messages for tests and dev; console adapter validates and logs without delivering. SMTP and HTTP API adapters (Resend, SendGrid, Postmark, SES) can plug in behind the same port without touching callers.
