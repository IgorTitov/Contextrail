<!-- @HEADER
@version 0.7.96 | 2026-05-05
@purpose ADR-0026: Move hook-integrity post-stamp regen (Addition B) from end-of-hook to Phase 5 inline position.
@sidecar 0026-hook-integrity-phase5-inline.md.header.md
@layer control-plane | @hex _none_ | @ctx hook-integrity
@public false
@edit careful -->

# ADR-0026 — Hook-integrity post-stamp regen: Phase 5 inline position

**Status:** Accepted  
**Date:** 2026-05-05  
**Slice:** TPL-287  
**Supersedes:** Addition B placement decision in ADR-0019 (TPL-278)

---

## Context

ADR-0019 (TPL-278, commit `75881a17`) added "Addition B" at the very end of
`.githooks/pre-commit`. Its purpose: when `.githooks/` files are in the staged
set, Phase 5's `header-fix --use-current-version` stamps a new `@version` on
those files, invalidating the fingerprint registry that was built before Phase 5
ran. Addition B re-runs `hook-integrity-check.mjs --update --from-pre-commit-hook`
and re-stages `.githooks/.fingerprints.json` with fingerprints that match the
post-stamp content — the fixed-point that will actually be committed.

The problem with end-of-hook placement: if Phase 6 (validation) or Phase 7
(heavy gates: tests + changelog-sync) fails and causes `exit 1`, the hook
terminates before reaching Addition B. The registry retains the pre-stamp SHA.
On the next `git commit` attempt, Phase 1.0 (hook integrity, non-skippable)
sees the mismatch and refuses with:

```
[pre-commit] FATAL: hook integrity check failed — refusing commit
```

The operator must run `COA_OPERATOR=1 node scripts/checks/hook-integrity-check.mjs --update`
manually before retrying — a hidden recovery burden that is easy to miss.

### Incidents

- **TPL-281** — Commit-msg slice-coverage feature (`f26ee112`): Phase 7 test
  failure after Phase 5 stamped the hook. Manual `--update` required before
  retrying.
- **AIC-DEV-149** — Cockpit port of commit-msg-check: same pattern, same manual
  recovery. Five total recovery operations documented across both incidents.

---

## Decision

Move Addition B from end-of-hook to **immediately after the Phase 5 `fi`**,
before Phase 6 begins.

### Why this position is safe

`run_parallel` in pre-commit is fully synchronous: it spawns background
subprocesses and then calls `wait "${pids[$i]}"` in a loop, collecting each
exit code before returning. When the Phase 5 `if`/`fi` block exits, every
parallel command (`sync.mjs`, `readme-fix`, `header-fix --use-current-version`,
`dependency-graph.mjs`) has finished. There is no race condition between
`header-fix` completing the `@version` stamp and Addition B reading the hook
file to recompute its SHA-256.

### Guard improvement

The relocated block adds `[ -n "$ORIG_STAGED" ] &&` before the `grep` test.
The original end-of-hook version piped an empty string through `grep -q`, which
returned exit 1 and triggered the `if` body incorrectly in edge cases where
`ORIG_STAGED` was unset or empty. The improved guard is explicit and safe.

### Trust model: unchanged

`--from-pre-commit-hook` continues to bypass the `COA_OPERATOR=1` gate. This
is equivalent privilege — the hook executes under a human-authorized `git
commit`, and Phase 1.0 already verified the hook's own integrity before this
block is reached. The trust model documented in ADR-0019 is unaffected.

### Why not remove Addition B entirely?

The relocation does not change the *why* — it only changes *when*. Phase 5's
`header-fix` still stamps a new `@version` on `.githooks/` files in the
staged set, and the registry must be rebuilt to match. Removing Addition B
would leave a permanent SHA mismatch after every Phase 5 run that touches hook
files.

---

## Consequences

### Positive

- **Retry without manual intervention.** When Phase 6 or Phase 7 fails and
  aborts the commit, the registry already matches the post-stamp hook content.
  Phase 1.0 on retry exits 0. No `COA_OPERATOR=1 --update` required.
- **Deterministic.** The fixed-point is established earlier, before any
  validation phase that could fail.
- **Compatible with all skip configurations.** When Phase 5 is skipped via
  `COA_SKIP_GATES`, `header-fix` does not run, so no `@version` stamp occurs.
  Addition B's `grep` guard returns false and the block is a no-op — correct.

### Neutral

- **Position relative to ORIG_STAGED re-stage:** Addition B still runs before
  the end-of-hook re-stage loop and auto-stage blocks, so `.fingerprints.json`
  is consistently staged before the commit blob is assembled.
- **Phase 5 skip semantics:** If Phase 5 is skipped, `header-fix` does not run,
  no stamp occurs, and Addition B's guard correctly does nothing.

### Negative

- None identified. The change is a pure position shift within the same file;
  the logic and trust model are identical.

---

## References

- ADR-0019 (`docs/adr/0019-hook-integrity-trust-model.md`) — original trust model
- TPL-278 (`75881a17`) — Addition B introduction
- TPL-281 (`f26ee112`) — first incident revealing end-of-hook placement problem
- `scripts/checks/hook-integrity-check.mjs` — the check being invoked
- `.githooks/.fingerprints.json` — the registry being maintained
- `tests/integration/hook-integrity-retry.test.mjs` — regression tests (TPL-287)
