<!-- @HEADER
@version 0.7.113 | 2026-05-06
@purpose 0035-coa-worktree-fail-stop.md — see sidecar for details.
@sidecar 0035-coa-worktree-fail-stop.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0035 — coa-worktree --create Fail-Stop Discipline (TPL-306)

**Status:** Accepted  
**Date:** 2026-05-06  
**Slice:** TPL-306  
**Rule:** C7 — Worktree fail-stop discipline

---

## Context

### ZVX-DEV-101 incident root cause

ADR-0034 documents the full ZVX-DEV-101 incident. The short summary:

1. Sonnet B ran `coa-worktree --create --slice=ZVX-DEV-101` and received:
   > Branch 'tx-ZVX-DEV-101' already exists. If it is stale, delete it first: git branch -D tx-ZVX-DEV-101

2. Sonnet B interpreted this as a hint to investigate the branch, found `git log` matching main (staged-but-uncommitted work was invisible), and **manually cd-ed into the existing worktree** to proceed with its own commit.

3. This hijacked Sonnet A's in-progress session, leading to a broken merge.

### Why the earlier gate matters

ADR-0034 added `coa-merge` step 0.5, which blocks merges from foreign tx-worktrees. That is a last-ditch guard. The earlier and better defense is at the `--create` failure point, which fires **before** any agent can enter the worktree.

A verbose fail message with explicit "STOP", recovery options, and the worktree path gives agents the information they need without needing to investigate manually — reducing the temptation to proceed anyway.

---

## Decision

Replace the terse `Branch '${branchName}' already exists. If it is stale, delete it first: ...` message with a verbose STOP block containing:

- Explicit "STOP. Do NOT cd into the existing worktree or reuse it."
- Enumerated causes (active session, aborted ceremony, namespace collision)
- Registered worktree path (from `listWorktrees`) or "orphaned branch" note
- Three numbered recovery options, starting with auto-pick as the safe default
- "DO NOT proceed without explicit operator approval" closing line

The same STOP pattern is applied to the secondary guard (`existsSync(wtPath)`) for consistency.

---

## Defense in depth

This ADR adds layer 1 (earliest, at --create time). The full defence stack is:

| Layer | Mechanism | ADR |
|-------|-----------|-----|
| 1 | `--create` STOP message (this ADR) | 0035 |
| 2 | `coa-merge` step 0.5 ownership check | 0034 |
| 3 | Agent discipline (memory + CLAUDE.md) | — |

---

## Consequences

- Agents get explicit, actionable guidance at the earliest possible failure point.
- Auto-pick (omit `--slice`) remains the recommended recovery path; the message surfaces it prominently.
- The operator-only recovery path (force-delete) is still present but clearly gate-fenced.
- No change to the happy path; only the error branch is modified.

---

## Evasion analysis

| Evasion vector | Defense |
|----------------|---------|
| Agent ignores STOP and cd-s manually | `coa-merge` step 0.5 blocks the merge (ADR-0034) |
| Agent invents a different slice ID that collides | Claim-check C4 rejects duplicate slice IDs |
| Operator force-deletes without checking session | `.coa-session` file documents ownership; runbook warns |
