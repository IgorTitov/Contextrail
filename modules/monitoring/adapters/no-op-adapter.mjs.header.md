---
fileId: contextrail-template:modules:monitoring:no-op-adapter
module: modules/monitoring
stability: evolving
steward: shared
api: "Adapter"
boundedContext: monitoring
summary: No-op monitoring adapter that swallows all events, metrics, and spans.
owns: Minimal MonitoringPort implementation that performs no side effects — used to disable monitoring in tests and constrained environments.
boundaries: Stays inside the monitoring bounded context. Adapters isolate infrastructure; the domain must not import this file.
invariants: Implements MonitoringPort; every method returns a minimal valid shape with no side effects.
notesForLLM: Use when a port is required but monitoring should be disabled. Do not use as the production default.
specRefs:
  - TPL-001
---

# no-op-adapter.mjs
