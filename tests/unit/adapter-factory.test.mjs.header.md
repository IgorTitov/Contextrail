---
fileId: contextrail-template:tests:unit:adapter-factory.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn:
  - apps/starter/platform/adapter-factory.mjs
  - modules/user-preferences/public-api.mjs
summary: Verify adapter factory selects the correct storage adapter based on mode and capabilities.
owns: The 12-test suite covering resolveStorageType for all modes and createStorageAdapter fallback behavior.
boundaries: Must not test individual adapter internals; those belong to per-adapter test files. Must stay limited to verifying that the factory routing logic selects and returns the correct adapter type.
invariants: Every supported mode must have explicit coverage. Fallback behavior must be tested with both capability-present and capability-absent inputs.
risks: Missing coverage of a new mode will allow the factory to silently return the wrong adapter in production without a failing test.
notesForLLM: resolveStorageType is a pure function; test it without I/O. createStorageAdapter instantiates a real adapter — use the returned object's StoragePort shape for assertions rather than checking internal implementation details. Add a test case whenever a new mode or fallback path is added to the factory.
tests: self
specRefs: TPL-031
related: docs/backlog/platform-seams.md
---

# adapter-factory.test.mjs
