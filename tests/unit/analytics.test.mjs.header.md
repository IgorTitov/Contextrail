---
fileId: contextrail-template:tests:unit:analytics.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the analytics module — fundamentals (port assertion, session manager, consent domain, console + noop adapters).
owns: Unit proof of analytics domain logic (session management, consent, DoNotTrack), port contract validation (assertAnalyticsPort), and basic adapter correctness (console, noop).
boundaries: Must import only through modules/analytics/public-api.mjs; behavioral-adapter behavior lives in analytics-behavioral.test.mjs and mouse-collector behavior lives in analytics-mouse-collector.test.mjs; integration-level behavior belongs in separate tests.
invariants: All imports must go through public-api.mjs, never through module internals; port validator must throw on any invalid adapter; consent and DoNotTrack functions must remain pure and side-effect-free in tests.
notesForLLM: Import exclusively via public-api.mjs. assertAnalyticsPort validates the full adapter surface — add new port-method assertions here first when the port contract changes.
tests: node --test tests/unit/analytics.test.mjs
related: tests/unit/analytics-behavioral.test.mjs; tests/unit/analytics-mouse-collector.test.mjs; tests/contract/analytics-hex-contract.test.mjs
specRefs:
  - TPL-163
  - TPL-164
  - TPL-165
  - TPL-166
  - TPL-167
  - TPL-218
---

# analytics.test.mjs
