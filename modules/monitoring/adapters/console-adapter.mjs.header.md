---
fileId: contextrail-template:modules:monitoring:console-adapter
module: modules/monitoring
stability: evolving
steward: shared
api: "Adapter"
boundedContext: monitoring
summary: Console monitoring adapter that prints structured JSON lines for events, metrics, and spans.
owns: Development-facing adapter that turns monitoring records into single-line JSON for easy grepping and pipe ingestion.
boundaries: Stays inside the monitoring bounded context. Adapters isolate infrastructure; the domain must not import this file.
invariants: Implements MonitoringPort; writes one JSON object per record; writer is injectable.
notesForLLM: Use this adapter for local development. For tests prefer the memory adapter. For production, swap in a real backend adapter.
specRefs:
  - TPL-001
---

# console-adapter.mjs
