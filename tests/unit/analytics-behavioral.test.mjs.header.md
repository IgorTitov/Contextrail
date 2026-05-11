---
fileId: contextrail-template:tests:unit:analytics-behavioral.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the analytics BehavioralAdapter — DOM-event lifecycle, click forwarding, behavioral consent gating, and scroll-threshold reporting.
owns: Unit proof of createBehavioralAdapter — startTracking/stopTracking, click forwarding to inner.track, behavioral consent suppression, and per-threshold scroll reporting.
boundaries: Must import only through modules/analytics/public-api.mjs; tests use mocked document.body / window globals and never touch a real DOM. Fundamentals (port, session, consent, console/noop) live in analytics.test.mjs; mouse-collector behavior lives in analytics-mouse-collector.test.mjs.
invariants: Behavioral consent must gate all tracking; scroll thresholds must report at most once per crossing; mocked document/window globals must be restored in finally blocks.
risks: Forgetting to restore globalThis.document, globalThis.window, or fake setTimeout/clearTimeout can poison subsequent tests in this file.
notesForLLM: Always restore mocked globals in finally blocks. Use the inner.track override pattern to capture forwarded events; do not assert on console output.
tests: node --test tests/unit/analytics-behavioral.test.mjs
related: tests/unit/analytics.test.mjs; tests/unit/analytics-mouse-collector.test.mjs
specRefs:
  - TPL-166
  - TPL-218
---

# analytics-behavioral.test.mjs
