---
fileId: contextrail-template:tests:unit:state.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: modules/state/public-api.mjs
summary: "Unit-test every public behavior of the state module: port assertion, memory adapter (getState, setState, subscribe, subscriberCount), persistent adapter (load, save, fallback), and error cases."
owns: Behavioral proof for assertStatePort (4 tests), createMemoryStateAdapter (10 tests), and createPersistentStateAdapter (6 tests) covering state reads, updates, subscriptions, persistence, and error cases.
boundaries: Must not test hex structural layout — that belongs in the contract test. Must not import from module internals; all access goes through public-api.mjs only.
invariants: Total test count (21) must not silently drop (1 skipped counts); all adapters must be exercised through the StatePort interface only; persistent adapter tests use mock StoragePort, not real storage.
risks: If public-api.mjs renames or removes an export, tests fail loudly — but a contributor may be tempted to patch the test import rather than align the module contract.
notesForLLM: All imports come through public-api.mjs — never add direct internal imports here. Each describe block maps to one public export or adapter; keep that one-to-one mapping clear. The beforeEach pattern creates a fresh store per test; preserve that isolation. Persistent adapter tests create a mock StoragePort inline — do not import real storage adapters.
tests:
  - Self-contained
  - run via node:test. node scripts/checks/header-check.mjs protects the header.
linkedDocs: docs/design/event-bus-state.md
specRefs:
  - TPL-048
  - TPL-049
  - TPL-050
  - TPL-051
  - TPL-052
---

# state.test.mjs
