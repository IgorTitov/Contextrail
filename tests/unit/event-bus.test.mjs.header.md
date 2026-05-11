---
fileId: contextrail-template:tests:unit:event-bus.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: modules/event-bus/public-api.mjs
summary: "Unit-test every public behavior of the event-bus module: port assertion, memory adapter (on, off, emit, listenerCount, clear), handler isolation, and error cases."
owns: Behavioral proof for assertEventBusPort (5 tests) and createMemoryEventBus (14 tests) covering handler registration, emission, removal, isolation, and error cases.
boundaries: Must not test hex structural layout — that belongs in the contract test. Must not import from module internals; all access goes through public-api.mjs only.
invariants: Total test count (19) must not silently drop; all adapter behavior must be exercised through the EventBusPort interface only.
risks: If public-api.mjs renames or removes an export, tests fail loudly — but a contributor may be tempted to patch the test import rather than align the module contract.
notesForLLM: All imports come through public-api.mjs — never add direct internal imports here. Each describe block maps to one public export; keep that one-to-one mapping clear. The beforeEach pattern creates a fresh adapter per test; preserve that isolation.
tests:
  - Self-contained
  - run via node:test. node scripts/checks/header-check.mjs protects the header.
linkedDocs: docs/design/event-bus-state.md
specRefs:
  - TPL-044
  - TPL-045
  - TPL-046
  - TPL-047
---

# event-bus.test.mjs
