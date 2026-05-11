---
fileId: contextrail-template:modules:user-management:user-management-port
module: modules/user-management
stability: evolving
steward: shared
api: "Port"
boundedContext: user-management
summary: Port contract that adapters must satisfy for the user-management module.
owns: Port contract that adapters must satisfy for the user-management module.
boundaries: Stays inside the user-management bounded context. Do not couple to other modules' internals.
invariants: Contract definition only; no implementation.
notesForLLM: Ports define what the domain needs, not how it is provided. Add typedef shapes here when you grow the contract.
specRefs:
  - TPL-001
---

# user-management-port.mjs
