---
name: coa-merge-autostash-preservation.test.mjs
description: Integration tests proving coa-merge preserves staged files across git rebase --autostash in transport worktrees (TPL-250).
type: tests
layer: tests
public: false
edit: careful
sidecarOf: coa-merge-autostash-preservation.test.mjs
relatedAdr:
  - docs/adr/0015-test-isolation-enforcement.md
  - docs/adr/0017-transport-branch-enforcement.md
relatedRule: r2-transport-branch
covers:
  - scripts/coa-merge.mjs (restageAfterAutostash, transport-mode ceremony)
testCount: 2
runner: node:test
invariants:
  - Every git invocation goes through safeGit/safeGitSpawn (R1, ADR-0015).
  - All fixtures live under os.tmpdir().
  - Subprocess env strips GIT_DIR/GIT_WORK_TREE to prevent escape to live repo.
  - Claim created/expires dates use dynamic wall-clock times to respect MAX_TTL_HOURS cap.
specRefs:
  - TPL-250
---

# coa-merge-autostash-preservation.test.mjs

Regression coverage for the autostash-drops-staged-files bug.

Test 1 (integration): sets up a transport-branch fixture with main one commit ahead,
stages `feature.js`, runs the full coa-merge ceremony, and asserts `feature.js` lands
in the HEAD commit instead of being left unstaged.

Test 2 (near-unit): imports `restageAfterAutostash` directly and verifies it re-stages
a file that was artificially dropped from the index via `git reset HEAD`.
