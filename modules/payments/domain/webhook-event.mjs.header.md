---
fileId: contextrail-template:modules:payments:webhook-event
module: modules/payments
stability: evolving
steward: shared
api: Domain
boundedContext: payments
summary: Pure webhook-event domain — Stripe-style signature parsing and verification with injected crypto primitives.
owns: parseSignatureHeader, verifyWebhookSignatureWith, CryptoBridge typedef.
boundaries: Fully pure — never imports node:crypto. Adapters inject HMAC + constant-time compare via CryptoBridge.
invariants: Timestamps outside tolerance are rejected. Constant-time compare is the adapter's responsibility.
notesForLLM: Accepts multiple v1 signatures for key rotation. Default tolerance is 300 seconds. Use the Node bridge in adapters/node-webhook-verifier.mjs on the server.
specRefs:
  - TPL-001
---

# webhook-event.mjs
