<!-- @HEADER
@version 0.7.121 | 2026-05-06
@purpose Document 0041-test-deletion-guard for this repository.
@sidecar 0041-test-deletion-guard.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0041 — Test-deletion guard for unattended-agent safety (TPL-314)

**Status:** Accepted
**Date:** 2026-05-06
**Deciders:** Igor Titov
**Refs:** TPL-314, R9, R1 (`docs/adr/0015-test-isolation-enforcement.md`),
R2 (`docs/adr/0017-transport-branch-enforcement.md`),
D6 cross-variant synthesis (`docs/analysis/session-summaries/2026-05-06_D6-CrossVariant-synthesis.md`),
F8 incident capture (`docs/analysis/session-summaries/2026-05-06_D6-VariantB-T2_attempt1.md`)

## Context

D6's BYO-LLM evaluation (Variant B — Qwen3.6-35B-A3B MoE running locally
through aider) surfaced an F8 failure mode: the model edited multiple
test blocks at once and ended up *removing* coverage rather than
*adding* it, with no signal at commit time that anything had vanished.
A test deletion was indistinguishable from a refactor at every gate the
template ships today — `header-check`, `architecture-check`, even the
test runners themselves were silent because the deleted tests simply
no longer existed to fail. The synthesis in
`2026-05-06_D6-CrossVariant-synthesis.md` §3 named this the highest-
priority public-launch blocker for BYO-LLM: an unattended local model
can quietly erode coverage in a single commit, and the operator has no
mechanical signal that it happened.

The same failure mode is open against cloud agents and humans — the
defense is universal, not local-LLM specific. What the local-LLM run
provided was a reproducible, low-cost way to surface the class.

## Decision

Introduce a non-skippable Phase 2.6 pre-commit guard,
`scripts/checks/test-deletion-guard.mjs`, that:

1. Reads the staged unified diff (`git diff --cached --unified=0`).
2. Filters to test paths under `tests/**` and `scripts/**` matching
   `*.{test,spec}.{mjs,js,cjs,mts,cts,ts,tsx,jsx}`.
3. Counts `+` and `-` lines containing `\b(?:test|it)\s*\(` in those
   files' hunks.
4. Computes net deletion = removed − added across the staged set.
5. If `net > 0` and the operator has not authorized the deletion via
   the two-factor override, refuses the commit with a per-file delta
   table and a pointer to this ADR.

The phase is wired between Phase 2.5 (R1 test-isolation) and Phase 2.7
(R2 transport-branch) and is listed in `NON_SKIPPABLE_PHASES` so
`COA_SKIP_GATES` cannot suppress it.

### Scope — Design Call A: `test()` and `it()` only

The block-count scope is deliberately narrow. `describe(`/`suite(` are
organizational wrappers, not test definitions. Counting them would
over-trigger on two legitimate refactor shapes:

- **Flatten**: `describe('outer', () => { test('a'); test('b'); })` →
  `test('a'); test('b');` at the top level. Net `describe` count drops
  by 1; net `test()` count is 0. The guard correctly stays silent.
- **Split**: one `describe` becomes two sub-`describe`s. Net describe
  count rises by 1; net `test()` count is 0. Silent.

If the guard counted `describe`, both shapes would block legitimate
work and operators would learn to ignore or bypass the guard. By
restricting scope to `test()`/`it()`, the false-positive class is
eliminated and the rule defends only the load-bearing surface
(definitions of executable test cases).

### Operator-override contract — Design Call B

Two factors, both required:

1. `COA_OPERATOR=1` in the environment (existing convention used by
   `claim-check --force-expire`, `coa-worktree --teardown-stale --execute`,
   etc.).
2. A line `Allow-test-deletion: <reason>` in the commit-message body,
   where `<reason>` has at least 3 non-whitespace characters after
   the colon. The reason is freeform but is logged to stderr by the
   guard so the audit trail records the operator's justification.

The guard reads the message from `.git/COMMIT_EDITMSG` (resolved via
`git rev-parse --git-dir` so linked-worktree layouts work). This file
is populated by:

- `git commit -m "<text>"` — git writes `<text>` verbatim before
  the pre-commit hook fires.
- `git commit` (no `-m`) — populated by editor session.
- `node scripts/coa-merge.mjs --message="<text>"` — wraps `git commit
  -m "<text>"` at `scripts/coa-merge.mjs:1631` (`run('git', ['commit',
  '-m', commitMessage], ...)`), so the same contract applies. The
  override line in `--message=` reaches the guard intact, including
  for multi-line bodies (header + blank line + body).

The integration test suite includes a `coa-merge passthrough` scenario
(Test #11 in `tests/integration/test-deletion-guard.test.mjs`) that
faithfully reproduces this contract end-to-end: it constructs a real
fixture, stages a deletion, writes a multi-line message to
`COMMIT_EDITMSG` exactly as `git commit -m` would, and asserts the
guard accepts the override and logs the reason. The contract is
empirically validated, not just documented.

Removing either factor (env alone, marker line alone, marker-line with
sub-3-char reason) refuses the commit. There is no env-only escape
hatch, no editor-prompt bypass, and no env-var name change is
recognised — only the literal `Allow-test-deletion:` marker counts.

### Detection trade-offs — Design Call C / D

The guard uses regex against unified diff text rather than full AST
parsing. This is a deliberate trade:

- Zero new dependencies; the guard runs on every commit so startup
  cost matters.
- The pattern surface is tiny — only `\b(?:test|it)\s*\(`. False
  positives include `test(` literals inside multi-line strings,
  embedded code samples in comments, and JSDoc examples — all of
  which legitimately count as "the source mentions a test()-shaped
  call site." When such a literal disappears from a staged diff, the
  guard fires; the operator has the override mechanism.
- The phase placement (between 2.5 and 2.7) co-locates the guard with
  its sibling defenses, all of which are non-skippable.

## Anti-evasion matrix

| # | Vector | Defense (current) |
| --- | --- | --- |
| 1 | Rename test (`test('foo')` → `test('foo bar')`) | net-counting nets 0; not flagged |
| 2 | Replace one `test()` with multiple smaller ones | net-counting passes (more added than removed) |
| 3 | Convert `test()` to a differently-named call (`runTest()`, `mySuiteRun()`) | regex pinned to `\b(?:test|it)\s*\(`; corner case documented; operator override available |
| 4 | Delete the test file outright by moving it outside `tests/**` | path filter still matches the `--- a/tests/...` half of the diff and counts removals against the deleted file |
| 5 | Stage the deletion outside `tests/**` (rename test file into `apps/...` first) | scope discipline matches existing R1 walker; off-path tests are not enforced. Mitigation: the rename itself is a code review surface; not in scope of this guard |
| 6 | Remove a `describe()` wrapper while preserving inner tests | **NOT a vector — explicitly out of scope.** Block-count nets 0 because describe is not counted; legitimate refactor passes cleanly |
| 7 | Set `COA_SKIP_GATES=2.6` to skip the phase | Phase 2.6 is in `NON_SKIPPABLE_PHASES`; `should_run` short-circuits before SKIP_PHASES is consulted |
| 8 | Tamper with the guard script to weaken regex | guard is in `protectedPaths` (claim coverage); R8.2 hook-integrity (Phase 1.0) catches tampered hook wiring |
| 9 | Bypass via `--no-verify` | R8 hook-integrity layer (Phase 1.0 + pre-push catch-net) closes this on the same surface as R1/R2 |
| 10 | Edit `Allow-test-deletion:` line at amend time | amend = new commit; pre-commit fires again; same gate applies |
| 11 | Inject `Allow-test-deletion:` into a comment so the line shows up but is a noop | guard parses `.git/COMMIT_EDITMSG` after git's `-m` writes it verbatim; commit-message body has no comment syntax that strips lines (`#` is a literal in `-m`); the line is real |
| 12 | Race two parallel commits to dilute the count | each commit is evaluated independently; per-commit net is what matters |

## Test surface

`tests/integration/test-deletion-guard.test.mjs` covers 12 scenarios:

- **4 pass paths**: only-additions, rename, describe-flatten, describe-add
- **5 block paths**: net deletion (no env / no marker), env-only, marker-only,
  marker-with-too-short-reason
- **1 allow path**: full two-factor override + reason logged
- **1 skip path**: non-test file
- **1 coa-merge passthrough**: multi-line `--message=` body preserves
  override line and is accepted

Every git invocation in the test suite goes through `safeGit` /
`safeGitSpawn` per R1 / ADR-0015.

## Consequences

- An unattended agent (local LLM, cloud agent, or human) cannot land
  a commit that silently drops test coverage. The operator must
  consciously author the override.
- The override leaves an audit trail in stderr (and, by extension, in
  the commit's pre-commit log) naming the reason — so review of past
  deletions is straightforward.
- One legitimate scenario does need operator action: a slice that
  removes obsolete tests as part of a refactor. The two-factor
  override is the sanctioned path; over-trigger noise is the cost
  of dependency-free detection.

## Related

- ADR-0015 (R1 test isolation) — same non-skippable phase tier
- ADR-0017 (R2 transport branch) — same non-skippable phase tier
- TPL-256 (R8.2 hook integrity) — closes `--no-verify` bypass for all
  pre-commit phases including 2.6
