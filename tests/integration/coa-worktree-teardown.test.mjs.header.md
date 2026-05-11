---
fileId: contextrail-template:tests:integration:coa-worktree-teardown:test:mjs
module: tests/integration
stability: stable
steward: shared
api: Test
dependsOn:
  - scripts/coa-worktree.mjs
  - tests/_setup/safe-git.mjs
summary: Integration tests for --teardown branch-ref cleanup (TPL-285, ADR-0023) — 4 cases covering merged, unmerged, missing-worktree, and already-deleted-branch scenarios.
owns: Proves that runTeardown deletes branch refs strictly (-d) for merged branches, preserves them for unmerged branches, handles missing worktrees gracefully, and tolerates pre-deleted branch refs without error.
boundaries: Uses safeGit / safeGitSpawn exclusively (R1, ADR-0015). All repos created under tmpdir().
invariants: exitCode 0 for all worktree-found cases; branch ref absent after merged teardown; branch ref present after unmerged teardown; branchDeleted/branchPreserved set correctly in result.
risks: None beyond standard R1 constraints.
securityPrivacy: All work is confined to fresh tmpdir mkdtemp() roots.
notesForLLM: Tests are fully independent — each creates its own tmpdir fixtures. Run with node --test tests/integration/coa-worktree-teardown.test.mjs.
tests:
  - node --test "tests/integration/coa-worktree-teardown.test.mjs"
linkedDocs:
  - docs/adr/0023-teardown-branch-cleanup.md
  - docs/adr/0016-worktree-lifecycle.md
  - docs/adr/0015-test-isolation-enforcement.md
generated: false
---

# coa-worktree-teardown.test.mjs
