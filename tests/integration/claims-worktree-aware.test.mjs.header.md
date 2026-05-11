---
fileId: contextrail-template:tests:integration:claims-worktree-aware:test:mjs
module: tests/integration
stability: stable
steward: shared
api: Test
dependsOn:
  - scripts/lib/fs-helpers.mjs
  - scripts/checks/claim-check.mjs
  - tests/_setup/safe-git.mjs
summary: Integration + unit tests for worktree-aware .claims/ discovery (TPL-288); proves resolveMainRepoRoot() returns main repo root from a linked worktree and that claim-check finds claims across the worktree boundary.
owns: 4 unit tests for resolveMainRepoRoot() and 4 integration tests spawning claim-check.mjs from a linked worktree fixture.
boundaries: Tests must use safeGitSpawn; cwd must resolve under os.tmpdir(). No live-git writes to the real repo.
invariants: Tests pass with or without CLAIMS_DIR env override; linked-worktree fixture must be torn down after each test.
generated: false
specRefs:
  - TPL-288
---

# claims-worktree-aware.test.mjs
