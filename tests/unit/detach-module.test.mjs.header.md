---
fileId: contextrail-template:tests:unit:detach-module.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn:
  - scripts/detach-module.mjs
  - node:test
  - node:assert
  - node:fs
  - node:os
  - node:path
summary: Unit-test the module detachment logic (manifest loading, dependency graph construction, backlog reference scanning, and safe removal) using isolated temporary directories.
owns: Unit-test coverage for loadManifests, buildDependentMap, findBacklogReferences, and detachModule using isolated temp directories.
boundaries: Must not write outside os.tmpdir(); must not depend on the real modules/ directory for mutation tests; must not test CLI output formatting (that is an integration concern).
invariants: All temp directories are created in beforeEach and cleaned in afterEach; tests that call detachModule must inject a custom root so the real modules/ directory is never modified; loadManifests() smoke test against the real repo is read-only.
risks: Temp-directory cleanup failures can leave stale directories across test runs; if detachModule root injection path changes, tests will silently mutate the real repo.
securityPrivacy: Uses tmpdir isolation; no secrets.
notesForLLM: The temp root is injected as a second argument to detachModule. Tests verify --dry-run never removes files and --force bypasses the dependent check. The loadManifests smoke test is deliberately read-only against the real repo.
tests: node --test tests/unit/detach-module.test.mjs
linkedDocs:
  - scripts/detach-module.mjs
  - docs/guides/module-detachment.md
specRefs: TPL-133
related: scripts/detach-module.mjs
---

# detach-module.test.mjs
