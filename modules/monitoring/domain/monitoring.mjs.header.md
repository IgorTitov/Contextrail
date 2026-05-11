---
fileId: contextrail-template:modules:monitoring:monitoring
module: modules/monitoring
stability: evolving
steward: shared
api: "Domain"
boundedContext: monitoring
summary: Pure domain factories for three monitoring primitives: events (exception/message with severity), metrics (counter/gauge/histogram), and spans (start/end with status), plus key-based redaction and sampling.
owns: Event, metric, and span creation functions, severity/metric-kind validation, redact utility, and all monitoring type definitions.
boundaries: Stays inside the monitoring bounded context. Do not couple to other modules' internals.
invariants: Pure functions only; no IO.
notesForLLM: Domain stays framework-free. Do not import from adapters/ or infrastructure.
specRefs:
  - TPL-001
---

# monitoring.mjs
