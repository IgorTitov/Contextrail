---
name: tdd
description: Enforce red-green-refactor, regression-first bugfixes, and deterministic test gates.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Enforce red-green-refactor, regression-first bugfixes, and small proving loops so changes are proven before they are broadened.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# tdd

## Rules

- write the failing test first
- bugfix means regression test first
- smallest valid implementation
- refactor only under green tests

## Before commit

Run:

```bash
node scripts/checks/test-gate.mjs
```
