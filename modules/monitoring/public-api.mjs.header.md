---
fileId: contextrail-template:modules:monitoring:public-api
module: modules/monitoring
stability: evolving
steward: shared
api: "Public API"
boundedContext: monitoring
summary: Single cross-module entry point for the monitoring module.
owns: Single cross-module entry point for the monitoring module.
boundaries: Stays inside the monitoring bounded context. Do not couple to other modules' internals.
invariants: Bounded to the ${name} module.
notesForLLM: Only this file may be imported from other modules. Do not deep-import into domain/, ports/, or adapters/.
specRefs:
  - TPL-001
exports:
  - assertMonitoringPort
  - buildExceptionEvent
  - buildMessageEvent
  - buildMetric
  - createConsoleMonitoringAdapter
  - createMemoryMonitoringAdapter
  - createNoOpMonitoringAdapter
  - finalizeSpan
  - getLocale
  - redact
  - redactContext
  - registerLocale
  - resetLocale
  - setLocale
  - shouldSample
  - t
---

# public-api.mjs
