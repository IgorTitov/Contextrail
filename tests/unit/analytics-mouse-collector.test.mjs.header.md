---
fileId: contextrail-template:tests:unit:analytics-mouse-collector.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the analytics MouseCollector — sample collection, batching/flush semantics, lifecycle, and visibility-aware throttling.
owns: Unit proof of createMouseCollector — mousemove sample collection, batchSize-driven flush, destroy-flushes-remaining, start/stop lifecycle, and reduced sampling when document.hidden.
boundaries: Must import only through modules/analytics/public-api.mjs; tests use mocked document and window globals and never touch a real DOM. Fundamentals live in analytics.test.mjs; behavioral-adapter behavior lives in analytics-behavioral.test.mjs.
invariants: Mocked document/window must be restored in finally blocks; collected samples must respect batchSize threshold; destroy must flush any pending samples.
risks: Leaving globalThis.window dimensions modified leaks state to other tests in this file.
notesForLLM: Always restore mocked globals in finally blocks. The sampleInterval=0 trick disables throttling for batching tests; use a non-zero interval only when testing visibility-driven throttling.
tests: node --test tests/unit/analytics-mouse-collector.test.mjs
related: tests/unit/analytics.test.mjs; tests/unit/analytics-behavioral.test.mjs
specRefs:
  - TPL-167
  - TPL-218
---

# analytics-mouse-collector.test.mjs
