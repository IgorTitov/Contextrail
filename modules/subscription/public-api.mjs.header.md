---
fileId: contextrail-template:modules:subscription:public-api
module: modules/subscription
stability: evolving
steward: shared
api: "Public API"
boundedContext: subscription
summary: Single cross-module entry point for the subscription module.
owns: Single cross-module entry point for the subscription module.
boundaries: Stays inside the subscription bounded context. Do not couple to other modules' internals.
invariants: Bounded to the ${name} module.
notesForLLM: Only this file may be imported from other modules. Do not deep-import into domain/, ports/, or adapters/.
specRefs:
  - TPL-001
exports:
  - assertSubscriptionPort
  - canTransition
  - changePlan
  - createMemorySubscriptionAdapter
  - createSubscription
  - getLocale
  - hasEntitlement
  - recordUsage
  - registerLocale
  - resetLocale
  - setLocale
  - t
  - transitionStatus
---

# public-api.mjs
