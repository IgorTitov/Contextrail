---
fileId: contextrail-template:modules:payments:memory-payments-adapter
module: modules/payments
stability: evolving
steward: shared
api: Adapter
boundedContext: payments
summary: In-memory PaymentsPort adapter — deterministic fake provider for tests and api-starter demo.
owns: createMemoryPaymentsAdapter, customers/intents/refunds Maps, id counters.
boundaries: No network, no filesystem. All state lives in the factory closure.
invariants: Validates through domain functions. Id generation is monotonic per adapter instance.
notesForLLM: Use injected clock for deterministic timestamps in tests. Payment methods starting with "pm_fail" simulate declines.
specRefs:
  - TPL-001
---

# memory-payments-adapter.mjs
