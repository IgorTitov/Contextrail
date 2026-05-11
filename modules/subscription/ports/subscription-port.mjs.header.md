---
fileId: contextrail-template:modules:subscription:subscription-port
module: modules/subscription
stability: evolving
steward: shared
api: "Port"
boundedContext: subscription
summary: Port contract that adapters must satisfy for the subscription module.
owns: Port contract that adapters must satisfy for the subscription module.
boundaries: Stays inside the subscription bounded context. Do not couple to other modules' internals.
invariants: Contract definition only; no implementation.
notesForLLM: Ports define what the domain needs, not how it is provided. Add typedef shapes here when you grow the contract.
specRefs:
  - TPL-001
---

# subscription-port.mjs
