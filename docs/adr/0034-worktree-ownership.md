<!-- @HEADER
@version 0.7.110 | 2026-05-06
@purpose 0034-worktree-ownership.md — see sidecar for details.
@sidecar 0034-worktree-ownership.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0034 — Worktree Ownership Invariant (TPL-304)

**Status:** Accepted  
**Date:** 2026-05-06  
**Slice:** TPL-304  
**Rule:** C6 — Worktree ownership invariant

---

## Context

### ZVX-DEV-101 incident timeline

1. **Sonnet A** ran `coa-worktree --create --slice=ZVX-DEV-101`. A tx-worktree was created with a `.coa-session` file identifying the session. Sonnet A staged work-in-progress including `computeSprintCloseSnapshot.ts`.

2. **Sonnet B** received task ZVX-18. It attempted `coa-worktree --create --slice=ZVX-DEV-101` → failed with "Branch already exists".

3. Sonnet B **cd-ed into the existing `tx-ZVX-DEV-101` worktree**, saw `git log` matching main (Sonnet A's staged-but-uncommitted work was invisible in log), concluded the worktree was "clean", and ran `coa-merge` with its own subset of changes — omitting Sonnet A's helper.

4. **Commit landed on main** with a missing import. Sonnet A had to recover via ZVX-DEV-102 (add the helper) and ZVX-DEV-103 (fixup changelog).

### Root cause

`coa-merge.mjs` had no guard against running inside a foreign session's tx-worktree. The "Branch already exists" failure from `coa-worktree --create` was the only signal, but it did not prevent Sonnet B from proceeding after manually entering the worktree directory.

---

## Decision

Add **step 0.5** to `coa-merge.mjs`, placed after the half-baked pre-flight detection (step 0) and before staged-files verification (step 1).

Step 0.5 reads the `.coa-session` file written by `coa-worktree --create` and compares its `agent` field to the caller's declared agent identity.

### Caller-agent resolution (priority order)

1. `--agent=<name>` CLI flag (highest — operator-explicit)
2. `COA_AGENT` environment variable (session-exported by `coa-worktree --create`)
3. `null` — identity unknown; step 0.5 refuses (see: missing-agent case)

### Logic summary

| Branch | session | callerAgent | allowForeign | result |
|--------|---------|-------------|-------------|--------|
| non-tx | any | any | any | skip (not-tx-branch) |
| null / HEAD | any | any | any | skip (no-branch) |
| tx-X | absent | any | false | refuse (no-active-claim) |
| tx-X | present | null | false | refuse (agent-unknown) |
| tx-X | present | null | **true** | pass + audit (override) |
| tx-X | present | ≠ session.agent | false | refuse (agent-mismatch) |
| tx-X | present | ≠ session.agent | **true** | pass + audit (override) |
| tx-X | present | = session.agent | any | pass (verified) |

### Missing-agent case decision: strict refuse

When neither `--agent=` nor `COA_AGENT` is set, step 0.5 refuses rather than skipping the check. Rationale:

- An agent that does not declare its identity cannot prove it owns the worktree.
- The `coa-worktree --create` output already instructs: `export COA_AGENT=<name>`. If the operator followed the ceremony, the env var is set.
- Strict refusal here forces explicit identity declaration on every invocation, closing a silent-bypass path.
- Exception: dual-key operator override (`COA_OPERATOR=1 COA_ALLOW_FOREIGN_WORKTREE=1`) passes even with null callerAgent; the operator takes full responsibility.

### Override gate (dual-key)

Mirrors the pattern established in TPL-281/TPL-299:

```
COA_OPERATOR=1 COA_ALLOW_FOREIGN_WORKTREE=1 node scripts/coa-merge.mjs --message="..."
```

Both keys must be set. A single key (`COA_ALLOW_FOREIGN_WORKTREE=1` without `COA_OPERATOR=1`) does **not** bypass. Every override writes a JSON Lines entry to `.claims/audit.log` with `event: worktree-ownership-override`, so all operator overrides are traceable.

### Why `.coa-session` (not claims)

The ownership token is the `.coa-session` file written by `coa-worktree --create`, not the claim filed at the same time. Rationale:

- The `coa-worktree` setup claim always uses `agent: "coa-worktree"` (the script's own identity). Using claims for the ownership check would require every implementing agent to also file a second claim — extra ceremony friction.
- `.coa-session` records `agent: process.env.COA_AGENT || branchName`, which matches the identity the implementing agent uses when running `coa-merge`.
- `.coa-session` does not expire (unlike claims). An expired claim would produce false "no-active-claim" errors on slow or long-running implementation sessions.
- The claims system remains the coordination mechanism for file-level conflicts (C1–C3). Step 0.5 is a session-level ownership gate, a different layer.

### Step placement (after half-baked detection, before step 1)

Step 0.5 fires after the step 0 half-baked and changelog-dupe pre-flights because those checks are also safe-to-fail (they refuse without any mutation). Step 0.5 must run before step 1 (staged-files check) so the refuse happens before any I/O or network operations.

---

## Edge cases

| Case | Behavior |
|------|----------|
| Detached HEAD | skip (no-branch) — coa-merge's earlier step 0.4 also refuses on detached HEAD |
| Direct commit to main/master | skip (not-tx-branch) — trunk flow, no worktree ownership applies |
| `.coa-session` absent (manual `git checkout -b tx-X`) | refuse (no-active-claim) — ceremony was not followed |
| `.coa-session` corrupt / non-JSON | refuse (no-active-claim) — `readCoaSession` returns null on parse error |
| Dry-run (`--dry-run`) | step 0.5 still runs — it is a safety check, not a mutation step |
| `COA_AGENT` set to empty string | treated as null (stripped); `resolveCallerAgent` returns null |

---

## Anti-evasion vectors

| # | Vector | Defense |
|---|--------|---------|
| 1 | cd into foreign worktree, run coa-merge without `--agent` | agent-unknown refuse |
| 2 | cd into foreign worktree, run with correct role name (e.g. `--agent=feature-implementer`) but different session | session.agent differs from callerAgent → mismatch refuse |
| 3 | Manual `git checkout -b tx-X` bypasses coa-worktree | no .coa-session → no-active-claim refuse |
| 4 | Single-key override `COA_ALLOW_FOREIGN_WORKTREE=1` | requires second key `COA_OPERATOR=1`; single-key → allowForeign=false → refuse |
| 5 | Dual-key operator override | passes with audit log entry — every override traceable |
| 6 | Delete `.coa-session` then run coa-merge | no-active-claim refuse |
| 7 | Forge `.coa-session` with callerAgent's identity | requires write access to foreign worktree; same precondition as direct file modification — not prevented here, but commits still land under the forged identity so audits remain useful |

---

## Consequences

- **Positive:** Closes the ZVX-DEV-101 worktree-theft class. Every coa-merge in a tx-worktree is now tied to the session that created it.
- **Positive:** Error messages are operator-actionable and include the recovery command.
- **Positive:** Override path exists for legitimate scenarios (operator takeover, recovery after session crash).
- **Neutral:** All `coa-merge` invocations on tx-branches now require `--agent=` or `COA_AGENT`. `coa-worktree --create` already outputs `export COA_AGENT=<name>`; following the ceremony automatically satisfies this.
- **Neutral:** `.coa-session` becomes a load-bearing file for the ceremony. Deleting it breaks the next coa-merge run (same as losing any other ceremony artifact).

---

## Related

- [ADR-0016 — Worktree lifecycle (R4)](0016-worktree-lifecycle.md)
- [ADR-0017 — Transport branch enforcement (R2)](0017-transport-branch-enforcement.md)
- [ADR-0031 — History-match tightening](0031-history-match-tightening.md) — same dual-key gate pattern
- [docs/rules-registry.md — C6](../rules-registry.md)
- `scripts/coa-merge.mjs` — step 0.5, exports `verifyWorktreeOwnership`, `resolveCallerAgent`, `readCoaSession`
- `tests/integration/coa-merge-worktree-ownership.test.mjs` — 8-case proof surface
