<!-- @HEADER
@version 0.7.92 | 2026-05-05
@purpose ADR: promote R8.4 bypass-audit pre-push check from warn-only bootstrap to hard-fail enforcement.
@sidecar 0022-r8-4-promote.md.header.md
@layer docs | @hex _none_ | @ctx bypass-audit
@public true
@edit careful -->

# ADR-0022 — R8.4 Bypass-Audit Hard-Fail Promotion

**Status:** Accepted
**Date:** 2026-05-05
**Slice:** TPL-284
**Supersedes:** Bootstrap warn-only stance introduced in TPL-258 / commit `a7c08c4c`

---

## Context

TPL-258 (commit `21308c27`, 2026-05-04) introduced R8.4 Bypass Audit:

- Pre-commit appends a `phases-ran` record to `.claims/coa-phases-ran.tmp`.
- Post-commit attaches the commit SHA and appends to `.claims/commit-audit.log`.
- Pre-push runs `bypass-audit-check.mjs` to flag recent commits that have no matching audit record (indicating `git commit --no-verify`).

A follow-up commit (`a7c08c4c`) immediately downgraded the pre-push invocation to warn-only:

```bash
node scripts/checks/bypass-audit-check.mjs --warn-only || true
```

The rationale was:

1. Pre-R8.4 history in `.claims/commit-audit.log` has no records at all. On a fresh
   install the log is empty; flagging all history as bypassed would be a false
   positive storm.
2. The `--warn-only` flag already exists in `bypass-audit-check.mjs` specifically
   for this scenario — it emits findings but exits 0, so operators can see what
   would be flagged without blocking pushes.
3. Target was 14+ post-R8.4 commits before promotion; a follow-up item
   (CG-R8-1) tracked the flip.

---

## Decision

Promote R8.4 to hard-fail (exit 1) in `.githooks/pre-push`.

**Evidence supporting promotion:**

| Criterion | Status |
|---|---|
| Post-R8.4 commit count | **113+** (target was 14+) |
| False positives surfaced during warn period | **0** observed in hook output during normal commits |
| Fresh-clone edge case handled | **Yes** — `bypass-audit-check.mjs` skips gracefully when no audit log exists |
| `--warn-only` flag still available for manual use | **Yes** — flag retained in the script for operator diagnostic use |

**Telemetry caveat:** The warn-only period relied on operator observation of hook
output rather than structured telemetry collection. No automated counter of
"warnings surfaced" was implemented. The bootstrap decision is based on the
time-and-volume heuristic (113+ commits without operator-reported false positives)
rather than measured evidence. This is an honest limitation.

---

## Change

`.githooks/pre-push` R8.4 block changes from:

```bash
echo "[pre-push] bypass-audit-check (R8.4, warn-only)"
node scripts/checks/bypass-audit-check.mjs --warn-only || true
```

To:

```bash
echo "[pre-push] bypass-audit-check (R8.4)"
if ! node scripts/checks/bypass-audit-check.mjs; then
  echo "[pre-push] FATAL: R8.4 bypass-audit failed — refusing push" >&2
  return 1
fi
```

`bypass-audit-check.mjs` itself is unchanged. The `--warn-only` flag remains
available for manual diagnostic runs (`node scripts/checks/bypass-audit-check.mjs --warn-only`).

---

## Recovery paths when R8.4 hard-fail triggers

1. **Missing audit record (--no-verify bypass):** Re-do the commit through the
   normal hook chain to generate a record, or re-push with `git push --no-verify`
   to document the bypass explicitly.
2. **Fresh clone (no audit log):** The check skips automatically — no action needed.
3. **Rollback if hard-fail surfaces real issues:** Revert the pre-push block to
   warn-only by re-adding `--warn-only` to the invocation. No structural change
   needed; the flag is preserved.
4. **`git push --no-verify` evasion:** Documented gap (CG-R8-3) — R8.3 CI
   assertion will close server-side when CI infrastructure is decided.

---

## Consequences

- Every push to a real remote now validates that recent commits ran through the
  hook chain. Genuine `--no-verify` bypasses block the push.
- Fresh clones and machines without a local audit log are unaffected (graceful skip).
- The `--warn-only` flag remains in the script for manual diagnostic use.
- CG-R8-1 is closed.

---

## References

- TPL-258: Initial R8.4 introduction + warn-only bootstrap
- CG-R8-1: Promotion follow-up item (now closed)
- `scripts/checks/bypass-audit-check.mjs`
- `scripts/lib/bypass-audit.mjs`
- `tests/unit/bypass-audit.test.mjs` (23 unit cases)
- `tests/integration/bypass-audit-check.test.mjs` (7 integration cases)
- `docs/rules-registry.md` § R8 — R8.4 entry
