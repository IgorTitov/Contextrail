---
fileId: contextrail-template:modules:rate-limit:rate-limit
module: modules/rate-limit
stability: evolving
steward: shared
api: "Domain"
boundedContext: rate-limit
summary: Token-bucket algorithm that refills tokens continuously at a configured rate and returns allow/reject decisions with retryAfterMs and remaining count.
owns: Bucket configuration validation, token refill calculation, and consume decision logic with caller-supplied time and externally owned state.
boundaries: Stays inside the rate-limit bounded context. Do not couple to other modules' internals.
invariants: Pure functions only; no IO.
notesForLLM: Domain stays framework-free. Do not import from adapters/ or infrastructure.
specRefs:
  - TPL-001
---

# rate-limit.mjs
