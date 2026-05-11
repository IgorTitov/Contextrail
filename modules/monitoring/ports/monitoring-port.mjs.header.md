---
fileId: contextrail-template:modules:monitoring:monitoring-port
module: modules/monitoring
stability: evolving
steward: shared
api: "Port"
boundedContext: monitoring
summary: Port contract that adapters must satisfy for the monitoring module.
owns: Port contract that adapters must satisfy for the monitoring module.
boundaries: Stays inside the monitoring bounded context. Do not couple to other modules' internals.
invariants: Contract definition only; no implementation.
notesForLLM: Ports define what the domain needs, not how it is provided. Add typedef shapes here when you grow the contract.
specRefs:
  - TPL-001
---

# monitoring-port.mjs
