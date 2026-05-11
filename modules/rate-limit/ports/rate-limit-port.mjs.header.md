---
fileId: contextrail-template:modules:rate-limit:rate-limit-port
module: modules/rate-limit
stability: evolving
steward: shared
api: "Port"
boundedContext: rate-limit
summary: Port contract that adapters must satisfy for the rate-limit module.
owns: Port contract that adapters must satisfy for the rate-limit module.
boundaries: Stays inside the rate-limit bounded context. Do not couple to other modules' internals.
invariants: Contract definition only; no implementation.
notesForLLM: Ports define what the domain needs, not how it is provided. Add typedef shapes here when you grow the contract.
specRefs:
  - TPL-001
---

# rate-limit-port.mjs
