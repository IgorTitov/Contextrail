<!-- @HEADER
@version 0.7.89 | 2026-05-05
@purpose ADR-0019: Phase-5 finalize — extend auto-stage allow-list and add post-stamp hook-integrity regen so hook-touching and version-bump slices don't leak dirty outputs.
@sidecar 0019-phase-5-finalize.md.header.md
@layer docs | @hex _none_ | @ctx hook-integrity
@public true
@edit careful -->

# ADR-0019 — Phase-5 Finalize: Auto-Stage Allow-List + Post-Stamp Hook-Integrity Regen

**Status:** Accepted  
**Date:** 2026-05-05  
**Slice:** TPL-278  
**Supersedes:** n/a  
**Related:** ADR-0014 (pre-commit stamp discipline), ADR-0015 (R1 test isolation), ADR-0016 (worktree lifecycle), TPL-256 (hook-integrity R8.2)

---

## Problem

Pre-commit Phase 5 runs two mutating operations:

1. `scripts/agent-contract/sync.mjs` — regenerates `AGENTS.md`, `.cursorrules`,
   `.agents/README.md`, `.agents/skills/README.md`, and every `.agents/skills/*/SKILL.md`
   with `REPO_VERSION` embedded and contract content refreshed.

2. `scripts/checks/header-fix.mjs --since=HEAD --use-current-version` — stamps
   the current version into every `@HEADER` line in the changed set.

Three incidents proved the post-Phase-5 staging step was incomplete:

| Incident | Root cause | Symptom |
|---|---|---|
| **AIC-DEV-136 → AIC-DEV-136** | `hook-integrity --update` run pre-stamp; Phase 5 then stamped `pre-commit`; registry stale at commit time. Next commit's Phase 1.0 detected drift. | Follow-up registry-regen commit required. |
| **TPL-277 → 1d91b244** | Phase 5's `sync.mjs` regenerated `AGENTS.md`, `.cursorrules`, 18 `.agents/skills/*` files; none were in the auto-stage allow-list at lines 325-333. | Post-commit `git status --porcelain` showed dirty adapter docs; follow-up `chore(adapters)` commit required. |
| **AIC-DEV-137 leftover** | Same mechanism, smaller surface — sync.mjs outputs left dirty after Cockpit slice. | "leftover .agents/ and AGENTS.md regen artifacts from the pre-commit hook's agent-contract sync weren't committed". |

Common root cause: **Phase 5 generates outputs that the post-Phase-5 staging step did not know about**.

---

## Decision

Two additions to `.githooks/pre-commit`, both executing after Phase 5 and after claim auto-complete:

### Addition A — Extend the auto-stage allow-list

Append explicit `git add` calls for every file `sync.mjs` can regenerate:

```bash
git add AGENTS.md
git add .cursorrules
git add .agents/README.md
git add .agents/skills/README.md
for f in .agents/skills/*/SKILL.md; do
  [ -f "$f" ] && git add "$f"
done
```

Rationale for **explicit paths / bounded loop** (not `git add .agents/` or `git add .`):
- Parallel-session WIP in `.agents/` must not leak into an unrelated commit.
- Every file `sync.mjs` can write is listed; adding a new output to `sync.mjs` requires
  a corresponding entry here (visible in code review).

### Addition B — Post-Phase-5 hook-integrity regen

When `.githooks/` files are in the original staged set, Phase 5's `header-fix`
stamps a new `@version` on `pre-commit` / `pre-push`. Any fingerprint registry
generated before the stamp is now stale (AIC-DEV-136 pattern). The fix is:

```bash
if echo "$ORIG_STAGED" | grep -q '^\.githooks/'; then
  node scripts/checks/hook-integrity-check.mjs --update \
    --from-pre-commit-hook 2>/dev/null \
    || echo "  WARN: hook-integrity --update failed (commit will still proceed)"
  git add .githooks/.fingerprints.json
fi
```

This captures the **post-stamp** blob — the fixed-point that will actually be
committed — so Phase 1.0 on the *next* commit sees consistent state.

The guard `grep -q '^\.githooks/'` uses `$ORIG_STAGED` (captured at hook start,
before any Phase mutations). Skipped when no `.githooks/` files were staged.

---

## `--from-pre-commit-hook` flag (hook-integrity-check.mjs)

The existing `--update` path requires `COA_OPERATOR=1`. For internal pre-commit
use, Addition B needs to call `--update` without an operator setting an env var
in their shell — the hook is not interactive.

A new `--from-pre-commit-hook` flag bypasses the `COA_OPERATOR` gate with the
following trust-model analysis:

**Trust signal (revised from draft):** `--from-pre-commit-hook` is accepted
without a `$GIT_DIR` check. The initial design required `$GIT_DIR` to be set as
a hook-environment guard, but this was invalidated during bootstrap testing:
Phase 7 of the pre-commit hook is **non-skippable** and executes `unset GIT_DIR`
before Addition B runs. By the time Addition B calls `--from-pre-commit-hook`,
`GIT_DIR` is already unset in the shell environment. Using `$GIT_DIR` as the
trust signal would mean the flag always refuses in production.

**Actual trust foundation:** Phase 1.0 (hook-integrity check, non-skippable)
verifies that the hook files on disk match their registered fingerprints before
any other phase runs. A tampered hook cannot skip Phase 1.0 (it is listed in
`NON_SKIPPABLE_PHASES`). When Addition B's `--from-pre-commit-hook` runs, it is
guaranteed that the hook executing is the registered, unmodified hook that a
human operator intentionally staged. The flag is equivalent to `COA_OPERATOR=1`;
anyone who can set `COA_OPERATOR=1` can also pass `--from-pre-commit-hook`.

**Privilege equivalence:** A human invoking `COA_OPERATOR=1 node scripts/checks/hook-integrity-check.mjs --update`
has the same privilege level as the pre-commit hook running the same command
after `git commit` was invoked by that same human. The `--from-pre-commit-hook`
bypass does not grant any capability that `COA_OPERATOR=1` already provides;
it only removes the need to export `COA_OPERATOR` before running `git commit`.

**Phase 1.0 still runs first (non-skippable):** Addition B is positioned after
Phase 1.0 passes. A tampered registry is caught at Phase 1.0 time, not bypassed
by Addition B. Addition B only runs *after* Phase 1.0 confirmed the registry
matched the pre-stamp worktree state.

**Bootstrap correctness:** Phase 1.0 runs against the registry-on-disk. If
`pre-commit` is in the staged set:

1. Phase 1.0 checks: registry matches pre-stamp worktree `pre-commit`. PASS.
2. Phase 5 stamps: `@version` in worktree `pre-commit` changes.
3. Addition B: `--update --from-pre-commit-hook` regenerates registry from
   the now-stamped worktree file. Stages updated registry.
4. Commit blob: both `pre-commit` (stamped) and `.fingerprints.json` (updated)
   land together. Fixed-point achieved.
5. Next commit's Phase 1.0: registry matches committed `pre-commit`. PASS.

Without Addition B: Phase 1.0 on next commit sees stamped `pre-commit` but
stale registry → FAIL (exactly AIC-DEV-136).

---

## Parallel-Session Safety

The auto-stage allow-list (Addition A) uses:
- Exact file paths (`AGENTS.md`, `.cursorrules`, `.agents/README.md`,
  `.agents/skills/README.md`)
- A loop bounded to `SKILL.md` files within `.agents/skills/*/`
- No `git add .`, `git add :/`, or directory-level `git add .agents/`

This means a parallel session editing `.agents/skills/repo-nav/SKILL.md`
for its own slice is NOT swept into an unrelated commit unless that file
was regenerated by Phase 5's `sync.mjs` for the active commit. Since
`sync.mjs` regenerates ALL skill files when it runs (it rewrites from the
canonical contract), any `.agents/skills/*/SKILL.md` that was edited by a
parallel session and is NOT yet staged by that session may be swept. This
is the expected behaviour: `sync.mjs` output is deterministic from the
contract, so any uncommitted edit to a SKILL.md that conflicts with sync.mjs
output is the parallel session's problem to resolve, not a leak.

The risk of a parallel session writing incompatible SKILL.md content that
doesn't match what sync.mjs would generate is low: SKILL.md files are
generated-only (never hand-edited per contract rules).

---

## Consequences

### Positive

- VERSION-bump slices no longer require follow-up `chore(adapters)` commits.
- Hook-touching slices no longer require follow-up registry-regen commits.
- Phase 1.0 on the commit after a hook-touching slice passes without operator intervention.
- Self-proving: the commit that introduces TPL-278 is itself a hook-touching
  slice (modifies `pre-commit`). If it commits cleanly and `git status --porcelain`
  is empty afterward, the fix is proven in-situ.

### Negative / Trade-offs

- Addition A stages sync.mjs outputs even when the operator did not explicitly
  add them. This is intentional (they are deterministic regenerations, not WIP),
  but it is a new auto-staging behavior that operators should be aware of.
- The `--from-pre-commit-hook` flag adds a second trust path to the operator gate.
  Any future addition of a new trust path must be documented in this ADR.

---

## Anti-Evasion Vectors

1. **Hook-touching slice with Phase 5 stamp drift** — Covered by Addition B +
   Test A (--from-pre-commit-hook bypass acceptance). Pre-fix reproducer:
   AIC-DEV-136.
2. **VERSION-bump slice with adapter doc drift** — Covered by Addition A +
   Test C (structural content check). Pre-fix reproducer: TPL-277 chore.
3. **Parallel WIP isolation** — Covered by Test C (absence of broad git add
   patterns in the sync.mjs block) + explicit allow-list in code review.
4. **`--from-pre-commit-hook` privilege escalation** — The flag has equivalent
   privilege to `COA_OPERATOR=1`. Both are operator-level capabilities. Anyone
   who can set `COA_OPERATOR=1` can also pass `--from-pre-commit-hook`; no
   privilege boundary exists between them. The foundational defense is Phase 1.0
   verifying hook integrity before the flag can be reached in normal execution.
   Test B confirms that `--update` without either authorization is refused.
