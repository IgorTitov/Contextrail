---
fileId: contextrail-template:tests:unit:import-graph.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn:
  - scripts/import-graph.mjs
  - node:test
  - node:assert/strict
  - node:fs
  - node:path
  - node:os
summary: Prove that parseImports correctly extracts ES module specifiers and that analyzeImportGraph performs recursive graph traversal, module detection, circular-import handling, and unresolved-import recording.
owns: Unit-level proof that parseImports and analyzeImportGraph meet their behavioral contracts under TPL-094.
boundaries: Must test import-graph.mjs in isolation using real temp-fs fixtures only. Must not depend on any other repo script or module. Must not test build-single.mjs behavior here.
invariants: All temp directories must be cleaned up in afterEach. Tests must not rely on any repo file outside the temp dir. Each test case must be independently runnable.
risks: Temp directory cleanup failure can leave disk artifacts. Tests that rely on specific path separators may break on Windows without normalization.
notesForLLM: Tests use actual file-system fixture directories, not mocks. The makeTempDir helper creates a unique temp dir and registers it for afterEach cleanup. Test for circular imports verifies that analyzeImportGraph terminates — check that files.size is bounded. The module-detection tests verify the modules Set by name, not by path.
tests: node --test tests/unit/import-graph.test.mjs
linkedDocs: docs/guides/tree-shaking.md
specRefs: TPL-094
related:
  - scripts/import-graph.mjs
  - tests/unit/build-treeshake.test.mjs
---

# import-graph.test.mjs
