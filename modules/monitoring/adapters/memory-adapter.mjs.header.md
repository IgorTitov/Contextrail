---
fileId: contextrail-template:modules:monitoring:memory-adapter
module: modules/monitoring
stability: evolving
steward: shared
api: "Adapter"
boundedContext: monitoring
summary: In-memory monitoring adapter that buffers events, metrics, and spans for tests and local inspection.
owns: In-memory buffered implementation of the MonitoringPort with deterministic clock and id factory injection.
boundaries: Stays inside the monitoring bounded context. Adapters isolate infrastructure; the domain must not import this file.
invariants: Implements MonitoringPort; mutations only through the returned port methods; exposes buffered state via reader functions.
notesForLLM: Use this adapter in tests — pass a fake `now` and `idFactory` for determinism. For production, swap to a real backend adapter.
specRefs:
  - TPL-001
---

# memory-adapter.mjs
