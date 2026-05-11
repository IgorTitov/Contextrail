---
fileId: contextrail-template:tests:unit:indexeddb-adapter.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: modules/user-preferences/public-api.mjs
summary: Verify IndexedDB adapter satisfies StoragePort contract with sync-cache pattern using a minimal fake IDBFactory.
owns: The 8-test suite covering IndexedDB adapter creation, port compliance, load/save, defensive copy, warm start, and isolation.
boundaries: Must not test browser DOM behavior directly; must rely solely on the minimal fake IDBFactory to stay environment-agnostic. Must not duplicate storage-port contract tests that belong to other adapter test files.
invariants: Every test must exercise a real behavior path through the adapter, not mock the adapter under test. The fake IDBFactory must remain minimal and not grow into a full browser simulation.
risks: If the fake IDBFactory drifts from real IDBFactory semantics, tests may pass while the adapter breaks in the actual browser environment.
notesForLLM: The fake IDBFactory lives in this file; do not replace it with a third-party mock library. Tests exercise the real adapter module — never stub the adapter itself. The sync-cache pattern means load() returns the in-memory cache synchronously after the first async open; test both cold and warm paths.
tests: self
specRefs: TPL-029
related: docs/backlog/platform-seams.md
---

# indexeddb-adapter.test.mjs
