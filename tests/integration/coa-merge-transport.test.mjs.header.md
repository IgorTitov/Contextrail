---
fileName: coa-merge-transport.test.mjs
version: 0.7.73
date: 2026-05-04
purpose: Integration tests for TPL-265 — Step 9c config capture/rollback with real git fixtures.
layer: tests
hex: _none_
ctx: _none_
public: false
edit: careful
specRefs:
  - TPL-265
covers:
  - scripts/coa-merge.mjs (captureGitConfig, restoreGitConfig, validatePushUpdateInsteadWorktree)
testCount: 4
runner: node:test
invariants:
  - Every git invocation goes through safeGit/safeGitSpawn (R1, ADR-0015).
  - All fixtures live under os.tmpdir().
relatedAdr:
  - docs/adr/0017-transport-branch-enforcement.md
---

# coa-merge-transport.test.mjs
