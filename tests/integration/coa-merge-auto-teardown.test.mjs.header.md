---
name: coa-merge-auto-teardown.test.mjs
description: Integration tests for coa-merge step 9e auto-teardown and step 9f claim auto-expire (TPL-283)
type: test
layer: tests
hex: _none_
ctx: _none_
public: false
edit: careful
owner: TPL-283 / ADR-0021
tests: self
seeAlso:
  - scripts/coa-merge.mjs
  - docs/adr/0021-auto-teardown-and-dirt-audit.md
  - docs/rules-registry.md
---

# coa-merge-auto-teardown.test.mjs

Integration tests proving step 9e (auto-teardown of merged tx-* branches) and
step 9f (claim auto-expire) in coa-merge. Uses real git fixtures under tmpdir
with safeGitSpawn (R1). Five scenarios: merged torn down, unmerged preserved,
dirty worktree preserved, stale claim expired.
