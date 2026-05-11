---
name: control-plane-audit
description: Audit drift across canonical instructions, rules, scripts, hooks, tasks, docs, sidecars, and tests, then fix it at the source.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define a reusable method for deterministic-first control-plane drift auditing across canonical repository surfaces.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# control-plane-audit

## First step

Run the deterministic audit first.

```bash
node scripts/checks/control-plane-check.mjs
```

## Canonical comparison set

Compare agreement across:

- `.claude/CLAUDE.md`
- `.claude/rules/*.md`
- `.claude/agents/README.md`
- `.claude/skills/README.md`
- `.claude/hooks/README.md`
- `.githooks/pre-commit`
- `scripts/checks/README.md`
- `package.json`
- `.vscode/readme.md`
- `docs/adr/*.md`
- `tests/integration/*.test.mjs`
- touched headers and `<file>.header.md` sidecars when role drift is suspected

## Drift classes

Classify findings as one of:

- **blocker drift** — command name, path, task label, or hook entrypoint does not exist
- **source-of-truth drift** — two canonical files disagree about the same workflow fact
- **unsupported claim** — docs or prompts promise behavior not enforced by scripts or tests
- **semantic stale-but-valid** — headers or docs are structurally valid but now describe the wrong role

## Repair rule

Fix the source.

Examples:

- stale script name in docs → fix the docs that claim it
- stale task label → fix the task owner, then the docs
- duplicate workflow policy in multiple places → keep the canonical owner, trim the duplicate
- semantically stale header → fix the header, not the surrounding code comments

## Specialist routing

When the audit points at a narrow specialist area:

- header semantics → `header-guardian`
- folder docs → `readme-guardian`
- proving layer or regression gap → `test-guardian`
- boundary leak → `hex-architect`

The audit should shrink drift, not grow itself.

