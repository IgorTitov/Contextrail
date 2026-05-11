---
fileId: contextrail-template:tests:unit:build-treeshake.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn:
  - scripts/build-single.mjs
  - scripts/import-graph.mjs
  - node:test
  - node:assert/strict
  - node:fs
  - node:path
  - node:os
summary: Prove that the --treeshake flag in build-single.mjs is parsed correctly and that the build copies only referenced module directories when treeshake is enabled.
owns: Unit-level proof that the --treeshake build path in build-single.mjs meets its behavioral contracts under TPL-095.
boundaries: Must test the treeshake code path of build-single.mjs only. Must not duplicate import-graph.mjs unit tests. Must use isolated temp directories — no real repo files.
invariants: All temp directories must be cleaned up in afterEach. The makeTempRoot fixture must match the real starter app directory structure that build-single.mjs expects. Each test case must be independently runnable.
risks: If makeTempRoot does not accurately mirror the real apps/starter structure, tests can pass while the real build breaks. Temp directory cleanup failure can leave disk artifacts.
notesForLLM: makeTempRoot creates a minimal but structurally representative apps/starter + modules/ layout. build() is called with an explicit root option pointing to the temp dir. The conservative test verifies that a module with an unresolved internal import is still included, not pruned. The result metadata test checks includedModules and prunedModules arrays returned by build() when treeshake is true.
tests: node --test tests/unit/build-treeshake.test.mjs
linkedDocs: docs/guides/tree-shaking.md
specRefs: TPL-095
related:
  - scripts/build-single.mjs
  - scripts/import-graph.mjs
  - tests/unit/import-graph.test.mjs
  - docs/guides/tree-shaking.md
---

# build-treeshake.test.mjs
