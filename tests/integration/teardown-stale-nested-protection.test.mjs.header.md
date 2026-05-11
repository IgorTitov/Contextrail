---
name: teardown-stale-nested-protection.test.mjs
description: Integration coverage proving --teardown-stale never picks nested permanent-infrastructure worktrees, including under --include-dirty (TPL-315 / ADR-0041).
type: tests
layer: tests
hex: _none_
ctx: _none_
public: false
edit: careful
---

# teardown-stale-nested-protection.test.mjs

Pins the TPL-315 fix: `classifyVerdict` collapses nested + clean (or known-infra basename + nested at any dirt) to `CLEAN_ACTIVE`, which both eligibility predicates correctly skip. Five fixture cases plus pure-helper assertions.
