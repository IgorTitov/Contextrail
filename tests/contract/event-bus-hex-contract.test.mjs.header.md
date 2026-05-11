---
fileId: contextrail-template:tests:contract:event-bus-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
dependsOn:
  - modules/event-bus/public-api.mjs
  - modules/event-bus/domain/
  - modules/event-bus/ports/
  - modules/event-bus/adapters/
summary: "Verify that the event-bus module satisfies its hexagonal architecture contract: required folder layout, public-api.mjs surface, expected named exports, and no deep internal imports from unit tests."
owns: Structural compliance proof that event-bus adheres to the hexagonal folder convention, exposes its full public-api surface, and does not leak internals through direct imports.
boundaries: Must not test runtime behavior or business logic; that belongs in the unit tests. Must not import from module internals directly; all access goes through public-api.mjs or filesystem path checks.
invariants: The three required hex folders (domain, ports, adapters) must always be asserted; public-api.mjs existence and its named exports must always be checked; the deep-import guard assertion must not be removed.
risks: If the module is restructured (e.g. a folder renamed), these assertions will fail loudly and correctly — but a contributor may be tempted to weaken the test rather than align the module layout.
notesForLLM: This file uses filesystem checks (existsSync) against the modules/event-bus/ tree — it does not import live module code except through public-api.mjs for export-name assertions. When adding a new required export, update both public-api.mjs and the export-list assertion here together.
tests:
  - Self-contained
  - run via node:test. node scripts/checks/header-check.mjs protects the header.
linkedDocs: docs/prd/event-bus-state.md
specRefs: TPL-047
---

# event-bus-hex-contract.test.mjs
