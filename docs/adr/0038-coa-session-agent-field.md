<!-- @HEADER
@version 0.7.117 | 2026-05-06
@purpose Document 0038-coa-session-agent-field for this repository.
@sidecar 0038-coa-session-agent-field.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0038 — coa-worktree --create: .coa-session.agent records caller identity (TPL-310)

**Status:** Accepted
**Date:** 2026-05-06
**Deciders:** Igor Titov
**Refs:** TPL-310, TPL-304 / ADR-0034 (worktree ownership), AIC-DEV-173 (anti-pattern surfaced)

## Context

TPL-304 (ADR-0034) introduced a worktree-ownership check at coa-merge step
0.5: the `.coa-session.agent` field must match the caller's `--agent=`
flag, otherwise coa-merge refuses unless `COA_OPERATOR=1 +
COA_ALLOW_FOREIGN_WORKTREE=1` overrides are set.

The intent of the override was rare cross-agent scenarios (operator manually
intervening in another agent's worktree). After Cockpit backported TPL-304,
AIC-DEV-173 documented an anti-pattern: **every routine ceremony required
the override**, because `coa-worktree --create` was writing
`.coa-session.agent` with the **branch name** (e.g. `tx-AIC-DEV-173`) rather
than the caller's actual agent role (e.g. `feature-implementer`).

Source line in `scripts/coa-worktree.mjs` pre-fix:

```js
agent: process.env.COA_AGENT || effectiveName,  // effectiveName = branch name
```

When `COA_AGENT` was not set in the environment (the common case), the
fallback recorded the branch name. coa-merge then read it back and refused
because no caller would identify itself as `tx-AIC-DEV-173`.

## Decision

`coa-worktree --create` records `.coa-session.agent` from caller identity,
not from the branch name. Identity comes from (in precedence order):

1. `--agent=<role>` CLI flag
2. `COA_AGENT` environment variable

In **transport mode** (when a `tx-<slice>` worktree is created — i.e.
`--slice=`, `--auto-pick`, or default auto-pick when no `--name=` is given),
identity is **required**. Without it, `--create` refuses with a recovery
hint pointing at `--agent=` and `COA_AGENT`.

Session mode (`--name=<session>`) is unchanged — identity is optional and
falls back to the session name, preserving backward compatibility for
non-transport sessions.

The strict refusal is gated by `enforceAgent: true` in `runCreate(opts)`.
The CLI sets it; the test seam defaults to `false` so existing tests (38
call sites) keep working without per-test agent injection. New strict-mode
tests pass `enforceAgent: true` explicitly.

## Backward compatibility

Pre-fix worktrees on disk still carry `agent: "tx-<slice>"`. They will
continue to require `COA_OPERATOR=1 + COA_ALLOW_FOREIGN_WORKTREE=1` on
coa-merge until torn down. Migration path: tear them down (`coa-worktree
--teardown --name=<tx-name>`) and recreate via `--create --agent=<role>`.

## Anti-evasion

| Vector | Defense |
|---|---|
| Caller forgets `--agent=` | Refused at `--create` (Option A strict) |
| Caller passes wrong `--agent=` | Caught later at coa-merge step 0.5 |
| Pre-existing worktree with bad agent | Grandfathered; override remains needed (transitional) |
| `COA_AGENT` env override | Preserved for long-running sessions |

## Consequences

- Routine ceremony no longer needs `COA_OPERATOR=1 +
  COA_ALLOW_FOREIGN_WORKTREE=1`. The override returns to its original
  purpose: rare legitimate cross-agent intervention.
- `coa-worktree --create` now requires explicit identity. Dispatch prompts
  must include `--agent=<role>` (or `COA_AGENT=<role>` env).
- Audit log noise from override usage drops to near-zero.
