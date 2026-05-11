<!-- @HEADER
@version 0.8.2 | 2026-05-10
@purpose ADR-0045: root-cause analysis and fix record for Phase 7 false-fail on test:integration.
@sidecar 0045-test-gate-integration-fix.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit manual-only -->

# ADR-0045 — Test-gate Phase 7 false-fail on test:integration

- **Status**: Accepted
- **Date**: 2026-05-11
- **Slice**: TPL-324
- **Related**: TPL-319 incident, ADR-0015 (test isolation), ADR-0018 (main-worktree guard)

## Context

TPL-319 (Codex release-prep session) used `git commit --no-verify` after
operator approval because the pre-commit Phase 7 (`test-gate.mjs`) reported
`test:integration: FAIL` even though direct serial runs of
`pnpm run test:integration` appeared green and `stderr` was empty.

The hypothesis from the TPL-319 session summary:
> Most likely remaining bug surface: `scripts/checks/test-gate.mjs` —
> interaction between test-gate and `pnpm run test:integration` — possible
> exit-code or stage-classification mismatch, not necessarily a real test failure.

TPL-324 was created to diagnose and close the root cause so that every routine
ceremony can pass Phase 7 without `--no-verify`.

## Root-cause analysis

Investigation identified three independent bug classes, all of which could
contribute to Phase 7 failures:

### B1 — Integration-test concurrency interference (primary TPL-319 cause)

`scripts/run-tests.mjs` passed all integration test files to `node --test`
without a concurrency limit. Node's default scheduling runs multiple test files
in parallel. Integration suites that exercise shared git/worktree flows and
temp-path coordination interfere with each other when concurrent, producing
non-deterministic failures.

Codex applied `--test-concurrency=1` in `scripts/run-tests.mjs` during the
TPL-319 session (commit `3cdb50e0` on `tx-TPL-319`). That branch was not
ff-merged to main before the release commit used `--no-verify`. TPL-324
cherry-picks this fix to main.

**Evasion vector**: a future change that re-adds concurrency or removes the
concurrency guard would re-open this class.

**Defense**: regression test in `tests/unit/test-gate-exit-semantics.test.mjs`
proves that test-gate correctly propagates exit codes; the `--test-concurrency=1`
guard is annotated with a comment referencing this ADR.

### B2 — main-worktree-guard.mjs unconditional main() at module level

`scripts/checks/main-worktree-guard.mjs` called `main()` unconditionally at
the bottom of the module file. When the module was `import`-ed by unit tests
(e.g. `tests/unit/main-worktree-guard.test.mjs`), `main()` ran immediately,
invoked `git rev-parse --show-toplevel`, and exited 1 when the working directory
was the main worktree (not a transport worktree).

This caused `test:unit` to report one failing test when `pnpm run test:unit`
was executed from the main worktree. During a ceremony running from a transport
worktree, `main()` exited 0 instead (the path resolved to a transport worktree
root), so the test passed. The bug was not visible in normal ceremony runs but
broke `test:unit` when run ad-hoc from the main worktree or during CI runs
that execute tests without a transport worktree.

**Fix**: Guard the `main()` call with an entry-module check:
```js
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main();
}
```

**Evasion vector**: removing or widening the guard condition would re-open the
class and break the `main-worktree-guard.test.mjs` import test.

### B3 — readme-check suffix matching misses .scratch subdirectories

`scripts/checks/readme-check.mjs` used a suffix-based filter
(`IGNORED_SUFFIXES`) that checked whether a directory path *ended* with a
known ignored name. The `tests/.scratch/` directory stores transient scratch
directories created by unit tests (e.g. `tests/.scratch/header-fix-idem-skip-*`).
Because `IGNORED_SUFFIXES` contained only terminal segment names (`_generated`,
`node_modules`, etc.), the suffix check matched `tests/.scratch` itself but
NOT its subdirectories (`tests/.scratch/header-fix-idem-skip-1234`).

Accumulated scratch directories that tests failed to clean up (e.g. due to
interrupted runs) caused `readme-check` to report hundreds of missing README.md
errors, causing test-gate to report `readme-check: FAIL`.

**Fix**: Replaced suffix matching with segment-based matching
(`IGNORED_SEGMENTS`), which excludes any directory containing `.scratch` as any
segment in its path, not just as the terminal segment.

**Evasion vector**: adding `.scratch` subdirectories under a different path
(e.g. `tests/helpers/.scratch`) would still be caught since the segment check
is path-position independent.

## Decision

Apply all three fixes atomically in TPL-324:

1. `scripts/run-tests.mjs` — add `--test-concurrency=1` when `testDir === 'tests/integration'`.
2. `scripts/checks/main-worktree-guard.mjs` — guard `main()` call with entry-module check.
3. `scripts/checks/readme-check.mjs` — replace `IGNORED_SUFFIXES` suffix check with `IGNORED_SEGMENTS` segment check; add `.scratch` to the set.

## Consequences

- Pre-commit Phase 7 passes in routine ceremonies without `--no-verify`.
- `pnpm run test:unit` passes from both main worktree and transport worktrees.
- `pnpm run test:integration` is deterministic regardless of Node's scheduling.
- Accumulated `tests/.scratch/` directories no longer cause false-fail in `readme-check`.
- The regression suite in `tests/unit/test-gate-exit-semantics.test.mjs` provides
  ongoing coverage of the exit-code contract.

## Anti-evasion checklist

- [ ] `run-tests.mjs` retains `--test-concurrency=1` for `tests/integration`.
- [ ] `main-worktree-guard.mjs` retains the entry-module guard.
- [ ] `readme-check.mjs` uses segment-based matching and includes `.scratch`.
- [ ] `test-gate-exit-semantics.test.mjs` remains in the unit test suite.
