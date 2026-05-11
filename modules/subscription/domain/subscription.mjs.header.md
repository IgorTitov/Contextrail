---
fileId: contextrail-template:modules:subscription:subscription
module: modules/subscription
stability: evolving
steward: shared
api: "Domain"
boundedContext: subscription
summary: Pure domain logic for the subscription module.
owns: Pure domain logic for the subscription module.
boundaries: Stays inside the subscription bounded context. Do not couple to other modules' internals.
invariants: Pure functions only; no IO.
notesForLLM: Domain stays framework-free. Do not import from adapters/ or infrastructure.
specRefs:
  - TPL-001
---

# subscription.mjs
