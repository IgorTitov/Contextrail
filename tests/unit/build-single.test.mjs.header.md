---
fileId: contextrail-template:tests:unit:build-single.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: scripts/build-single.mjs
summary: Verify build script argument parsing, source path resolution, HTML patching, and file copy with temp directories.
owns: The 19-test suite covering parseArgs, getSourcePaths, patchHtml, and full build integration using real temp directories.
boundaries: Must not become an integration test for the full deployment pipeline; scope is limited to the build-single script's own functions and the file system operations it performs.
invariants: Integration test cases must use real temp directories and not mock Node.js fs APIs. Unit test cases for pure functions must not perform any file I/O.
risks: Path construction tests that use hard-coded OS path separators will fail on one platform while passing on another; use path.join throughout.
notesForLLM: Integration cases use os.mkdtemp for real temp dirs and clean up in finally blocks — preserve that pattern. parseArgs and patchHtml are pure functions tested without disk I/O. When adding a new CLI flag to build-single.mjs, add a matching parseArgs test here first.
tests: self
specRefs: TPL-032
related: docs/backlog/platform-seams.md
---

# build-single.test.mjs
