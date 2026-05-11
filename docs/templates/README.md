<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Index for canonical prompt templates used in parallel-session dispatch and cross-repo backport workflows.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# docs/templates/

Canonical prompt templates for recurring agent-dispatch patterns.

## Templates

| File | Purpose |
|---|---|
| [dispatch-prompt.md](dispatch-prompt.md) | Parallel-session dispatch — one implementation slice, one COA session |
| [backport-prompt.md](backport-prompt.md) | Cross-repo backport — porting a landed slice from template to a downstream repo |

## When to use

Copy the relevant template, replace all `<angle-bracket>` placeholders,
fill in the slice-specific steps, then paste into a fresh Sonnet tab
inside a quadruple-backtick code block.

The templates encode lessons from R1, R4, R2, TPL-237, TPL-241,
TPL-242, and TPL-243. Both sections and hard-stops are structural —
do not omit them.

## Operating context

- [docs/guides/parallel-sessions.md](../guides/parallel-sessions.md) — worktree isolation, coa-merge, claim discipline
- [docs/rules-registry.md](../rules-registry.md) — D1 rule (aggregator dispatch templates)
- [docs/guides/aggregator-checklist.md](../guides/aggregator-checklist.md) — aggregator-session checklist
