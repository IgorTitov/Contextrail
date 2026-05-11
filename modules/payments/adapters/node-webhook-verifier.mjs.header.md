---
fileId: contextrail-template:modules:payments:node-webhook-verifier
module: modules/payments
stability: evolving
steward: shared
api: Adapter
boundedContext: payments
summary: Node crypto bridge — injects HMAC-SHA256 + constant-time compare into the pure webhook verifier.
owns: nodeCryptoBridge, computeSignature, verifyWebhookSignature (Node-flavored wrapper).
boundaries: The only file in this module that imports node:crypto. Domain stays pure.
invariants: Signature comparison uses timingSafeEqual on equal-length hex buffers only.
notesForLLM: A WebCrypto bridge for browsers can ship later with the same CryptoBridge shape.
specRefs:
  - TPL-001
---

# node-webhook-verifier.mjs
