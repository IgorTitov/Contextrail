---
fileId: contextrail-template:tests:unit:scheduler.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the scheduler module.
owns: Unit proof of scheduler module domain logic (parseCronLike, addJitter), port contract validation (assertSchedulerPort), and adapter correctness (interval, idle, and visibility-aware adapters).
boundaries: Must import only through modules/scheduler/public-api.mjs; must not test UI timer displays or DOM scheduling hooks; browser-environment adapters (idle, visibility-aware) require Web API mocking in the Node.js runner.
invariants: All imports must go through public-api.mjs; assertSchedulerPort must throw on any adapter missing required interface; adapters must be destroyed after each test to prevent timer leakage; addJitter must always stay within documented bounds.
risks: Real-time interval tests (using wait()) slow the suite; prefer minimal wait durations and tear down adapters promptly.
notesForLLM: Import exclusively via public-api.mjs. Always call adapter.destroy() after interval-based tests to prevent leaking timers across cases. Browser-specific adapters (idle, visibility) need globalThis mocks for requestIdleCallback and document.visibilityState.
tests: node:test runner via pnpm test:unit
related: tests/contract/scheduler-hex-contract.test.mjs
specRefs:
  - TPL-168
  - TPL-169
  - TPL-170
  - TPL-171
---

# scheduler.test.mjs
