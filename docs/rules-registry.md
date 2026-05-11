<!-- @HEADER
@version 0.8.8 | 2026-05-11
@purpose Canonical narrative registry of every rule the Contextrail template enforces or aspires to enforce, with per-rule whitehack analysis (evasion vectors + defenses) and test-coverage status.
@sidecar rules-registry.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Rules Registry — what this template enforces, and how it resists evasion

**Status:** Living document. Introduced TPL-240 at v0.7.41 as the canonical
overlay across CLAUDE.md, ADRs, `.claude/rules/*`, the compatibility
contract, and the executable enforcement scripts.

**Purpose.** A single document that answers, per rule:

1. What does the rule require?
2. Why does it exist?
3. Where is it defined? Who enforces it? What proves it?
4. How could a clever ("хитрожопый") agent evade it, and what stops them?
5. Where are the test-coverage gaps?

The registry is the source of truth for **rule integrity**. The
companion `docs/backlog/rule-coverage-gaps.md` sizes every "test
needed" entry as an actionable slice.

## How to use this document

- **Authoring a new feature?** Read the entries for any rules your slice
  touches before you start. The whitehack tables are the fastest way to
  see what classes of bug the rule guards against.
- **Authoring a new rule?** Add a registry entry **in the same commit**
  that introduces the rule. The whitehack analysis is non-optional — a
  rule without an evasion analysis is, by definition, untested for
  bypass paths.
- **Auditing a rule?** Cross-reference the registry's "Defined in" /
  "Owner" / "Test surface" with the actual files. A drift here is a
  finding.
- **Auditing the registry?** A rule that has CLAUDE.md / ADR / contract
  presence but **no registry entry** is the load-bearing check —
  that's the kind of gap that causes silent erosion.

## Categories

| Category | Meaning | Example |
|---|---|---|
| **A — Enforced** | Code-level checks reject violations at lint/runtime/pre-commit. Bypass requires deliberate tampering. | R1 test-isolation, R2 transport-branch, R4 worktree-lifecycle. |
| **B — Aspirational** | Rule is documented and partially enforced; full enforcement requires reasoning a script cannot do. | TDD default, BBA workflow, hexagonal boundaries. |
| **C — Discipline** | No code enforcement is feasible; defense is review and process. | "Always write summary file in dispatch", "no `git add -u`". |

Rule IDs in this registry are stable. When a rule ships a code-level
enforcement that earns it a numbered ID (R1, R2, R4...), both the
narrative ID and the canonical ID appear here.

## Rule index

| ID | Title | Category | ADR / Owner |
|---|---|---|---|
| **R1** | Test isolation (no live-git writes) | A | ADR-0015 / `test-isolation-check.mjs` |
| **R2** | Transport-branch enforcement | A | ADR-0017 / `transport-branch-check.mjs` |
| **R4** | Worktree lifecycle (audit / refresh / teardown) | A | ADR-0016 / `coa-worktree.mjs` |
| **R5** | Main-worktree guard (block direct commits to main) | A | ADR-0018 / `main-worktree-guard.mjs` |
| **R6** | Merge-ceremony drift detection (6-check post-hoc audit) | A | TPL-245 / `merge-ceremony-drift-check.mjs` |
| **R8** | Hook integrity / bypass closer (R8.1: snapshot coverage; R8.2: hook fingerprints; R8.4: bypass audit; R8.5: trunk integrity) | A | TPL-247/TPL-256/TPL-258/TPL-259 / `snapshot-coverage-check.mjs` + `hook-integrity-check.mjs` + `bypass-audit-check.mjs` + `trunk-integrity-check.mjs` + hooks |
| **R9** | Test-deletion guard (Phase 2.6 — net `test()`/`it()` deletion refused without two-factor operator override) | A | ADR-0041 / `test-deletion-guard.mjs` |
| **R11** | Frozen-paths subset on active claims (P4 defense-in-depth for F12 explicit-scope) | A | ADR-0043 / `claim-check.mjs --acquire --frozen` + `--enforce --staged` |
| **C1** | Claims protocol — modify/replace conflict blocking | A | ADR-0008 / `claim-check.mjs` |
| **C2** | Claims auto-expire stale claims | A | ADR-0008 / `claim-check.mjs --auto-expire` |
| **C3** | Protected paths require claim coverage | A | `.claims/config.json` + claim-check enforce |
| **M1** | coa-merge atomicity (J1 deferred mutation + rollback) | A | TPL-222 / `coa-merge.mjs` |
| **M2** | coa-merge half-baked detection (J2 pre-flight) | A | TPL-222 / `coa-merge.mjs` |
| **M3** | coa-merge auto-extend ceremony+regen claims (J5) | A | TPL-222 / `coa-merge.mjs` |
| **M4** | Auto-complete verification (J3 — HEAD + agent + extended-target) | A | TPL-223 / `claim-check.mjs --auto-complete` |
| **F1** | Force-expire authorization (5-layer) | A | TPL-221 / `claim-check.mjs --force-expire` |
| **F2** | Force-expire abandoned-check (3-signal heuristic) | A | TPL-225 / `claim-check.mjs` |
| **H1** | Header sidecar discipline (slim inline + sparse sidecar) | A | ADR-0009 / `header-check.mjs` |
| **H2** | Per-file `@version` last-content-change semantics | A | ADR-0014 / pre-commit `--use-current-version` (TPL-246) |
| **B1** | Module work-surface budget (≤ 8K warn / 12K error) | A | ADR-0013 / `module-fit-check.mjs` |
| **T1** | Spec / USM traceability (pre-impl gate) | A | `spec-check.mjs`, `pre-impl-gate.mjs` |
| **T2** | Changelog / VERSION discipline | A | `release-discipline-check.mjs` |
| **T3** | Commit message format (Conventional + work-item ID + ≤100 chars) | A | `commit-msg-check.mjs` |
| **A1** | BBA workflow (seam-first, disabled-by-default) | B | ADR-0002 / trunk-bba skill |
| **A2** | Hexagonal boundaries (no deep imports) | B | ADR-0006 / `architecture-check.mjs` |
| **A3** | TDD default (failing test first; regression-first bugfixes) | B | CLAUDE.md / `test-gate.mjs` |
| **A4** | README in every meaningful folder | B | `readme-check.mjs` |
| **A5** | Atomic commits (one slice = one commit) | B | CLAUDE.md / `changeset-size-check.mjs` |
| **A6** | i18n / messages layer for all user copy | B | architecture.md |
| **A7** | UI selectors from bounded registry | B | CLAUDE.md / `apps/starter/ui-selectors.mjs` |
| **D1** | Aggregator dispatch templates (canonical structure, summary file) | C | `docs/guides/parallel-sessions.md` / `docs/templates/` |
| **D2** | No `git add -u` / `git add .` | C | `.claude/rules/development.md` |
| **D3** | Pull --rebase before VERSION / CHANGELOG bump | C | development.md |
| **D4** | Scope repo-wide fix scripts to active dir | C | development.md |
| **W1** | Main-worktree dirt audit (warn-only Phase 0.5) | A | ADR-0021 / `main-worktree-dirt-audit.mjs` |

Thirty-four rules in this revision (R8.1 added by TPL-247; R8.2 added by TPL-256; R8.4 added by TPL-258; R8.5 added by TPL-259; W1 added by TPL-283; R9 added by TPL-314; R11 added by TPL-317). Two — D3, D4 — were
promoted out of "miscellaneous" while drafting; both are discipline-only.

---

## R1 — Test isolation (no live-git writes from tests)

**Statement.** No test in this repository may write to a git repository
that is not under `os.tmpdir()` (or `process.env.RUNNER_TEMP`),
regardless of how the test is structured, what env vars are set, or
what the programmer thought they were doing.

**Why.** On 2026-04-28 a Zvenix-class incident occurred: an integration
test that *looked correct* (mkdtemp sandbox + `cwd: dir` on every git
call) wrote 27–30 sandbox commits onto live `main`, regressing
`VERSION` from `0.4.x` to `0.1.0` and burying real trunk under junk
commits. Root cause: inherited `GIT_DIR` / `GIT_WORK_TREE` env vars in
the parent shell *override* `cwd` and route every "isolated" git call
into the live repo. This is a class of bug. "Remember to scrub
GIT_DIR" does not survive across hundreds of test files.

**Category:** A — Enforced (4-layer defense in depth).
**Defined in:** `docs/adr/0015-test-isolation-enforcement.md`,
`.claude/rules/testing.md`, `.claude/CLAUDE.md` (Enforced rules section).
**Owner script(s):** `scripts/checks/test-isolation-check.mjs` (static).
**Runtime guard:** `tests/_setup/no-live-git.mjs`.
**Sanctioned helper:** `tests/_setup/safe-git.mjs`.
**Pre-commit phase:** 2.5 — non-skippable (in `NON_SKIPPABLE_PHASES`).
**Test surface:** `tests/checks/test-isolation-check.test.mjs` +
17 fixtures under `tests/checks/fixtures/test-isolation/`.
**Cross-references:** R2 (Phase 2.7 sits next to 2.5), R8.2 (hook
integrity, TPL-256 — Phase 1.0 non-skippable sits before 2.5).

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Write `execSync('git ...', { cwd: liveRepo })` directly | static check pattern `cwd-non-tmpdir`; runtime monkey-patch refuses non-tmpdir cwd; pre-commit refuses unstaged work to commit | — | exists (fixture `bad-cwd-process-cwd.fixture.mjs`) |
| 2 | Write `execSync('git ...', { cwd: dir })` to mkdtemp dir but inherit poisoned `GIT_DIR` | runtime guard refuses to start with offending env vars; static check pattern `no-env-override` | — | exists (`bad-no-env-override.fixture.mjs`) |
| 3 | Bypass via `'gi' + 't ...'` string concatenation | static check `dynamic-cmd` flags any concat whose first literal segment starts with `g` | — | exists (`bad-dynamic-cmd.fixture.mjs`) |
| 4 | `process.chdir(liveRepo)` then call git without cwd | static check pattern `process-chdir` fires regardless of subsequent calls | — | exists (`bad-chdir.fixture.mjs`) |
| 5 | `await import('child_process')` dynamically from a test | static check `dynamic-import-cp` pattern | — | exists (`bad-dynamic-import.fixture.mjs`) |
| 6 | `spawn(cmd, [...])` where `cmd` is a bare identifier (`gitCmd`, `gitBin`, `git`, `bin`, `exe`) | static check `spawn-variable` pattern flags suspicious identifiers | — | exists (`bad-spawn-variable.fixture.mjs`) |
| 7 | `fs.writeFileSync('/repo/.git/refs/heads/main', ...)` direct internal write | static check pattern `fs-git-write` matches `**/.git/**` writes | extend to `fs.unlinkSync` on `.git` paths | partial (write covered; delete not) — see CG-R1-1 |
| 8 | Move test outside `tests/` to `scripts/foo.test.mjs` | static check walks both `tests/**` and `scripts/**` for `*.{test,spec}.mjs` | — | exists (covered by walk surface) |
| 9 | Indirection through helper file outside the test (`./helper.mjs`) | static check builds transitive import closure one hop deep | extend to N-hop closure to defeat helper-of-helper indirection | partial — see CG-R1-2 |
| 10 | Set `COA_SKIP_GATES=2.5` to bypass | Phase 2.5 is in `NON_SKIPPABLE_PHASES`; `should_run` short-circuits before SKIP_PHASES is consulted | — | exists (manual verification + meta-test in `tests/checks/pre-commit-non-skippable.test.mjs` if exists) — see CG-R1-3 |
| 11 | Add file to `test-isolation-allowlist.json` without justification | allowlist file is in `protectedPaths`; meta-test asserts `files.length === 0` initially; per-file annotation requires 60-char minimum reason | — | exists (`tests/checks/test-isolation-check.test.mjs` allowlist meta-test) |
| 12 | Modify the static check itself to weaken regex | `--self-test` runs all 17 fixtures FIRST in pre-commit; tampered detector fails its own meta-validation before scanning real code; check is in `protectedPaths` | — | exists (self-test mode + protectedPaths) |
| 13 | Modify the meta-test to skip a fixture | meta-test file is in `protectedPaths`; staging modifications without claim is blocked | — | exists (protectedPath enforcement) |
| 14 | Delete a fixture file | meta-test fails at startup with "missing fixture: <name>" — fixtures are NOT in `protectedPaths` (would deadlock claim coverage given literal-path matching), inventory check is the defense | — | exists (meta-test inventory) |
| 15 | Tamper with `safe-git.mjs` to drop env-override | `safe-git.mjs` is in `protectedPaths`; meta-test asserts `SAFE_GIT_ENV_KEYS` contains all 5 keys and length === 5 | — | exists |
| 16 | Run `node tests/foo.test.mjs` directly without `--import` flag | runtime guard does not fire — but static check stops the commit at pre-commit time | add CI-level "test command was the package.json one" guard | gap — see CG-R1-4 |
| 17 | Write the test in TypeScript or another extension the walker doesn't follow | walker globs `*.{mjs,test.mjs,spec.mjs}` — `.ts` files aren't scanned today | extend walker to `.{ts,tsx,js,cjs}` if/when those land | gap — see CG-R1-5 |
| 18 | Use git plumbing (`update-ref`, `write-tree`) directly via `safeGit` to a poisoned cwd | `safeGit` calls `realpathSync(cwd)` and refuses if not under `tmpdir`/`RUNNER_TEMP`; symlink redirection defeated | — | exists (covered by `safe-git.mjs` invariant assertions) |

### Test coverage gaps

- **CG-R1-1** — extend `fs-git-write` pattern to also flag `unlinkSync` / `rmSync` on `.git/**`. Today only `writeFile*` is matched.
- **CG-R1-2** — extend transitive import closure to N hops (currently 1). Helper-of-helper indirection slips through.
- **CG-R1-3** — meta-test that pre-commit `NON_SKIPPABLE_PHASES` literal contains `2.5` (defense against accidental edit).
- **CG-R1-4** — package.json invariant test: every `test:*` script must include `--import ./tests/_setup/no-live-git.mjs`.
- **CG-R1-5** — extend walker to `.ts` files (and TypeScript-test variants) when those formats land in the repo.

---

## R2 — Transport-branch enforcement

**Statement.** Every commit lands either (a) directly on trunk
(`main`/`master`), OR (b) on a transport branch matching `tx-<slice-id>`
shape, which never carries a `VERSION`/`CHANGELOG.md`/`package.json`
bump except via a coa-merge ceremony marker. Any commit attempt on any
other branch shape is refused at pre-commit time.

**Why.** Between 2026-04-27 and 2026-04-28, three Zvenix backport
sessions worked on operator-named long-lived branches
(`tpl222-backport`, `zvx-053-tpl233-backport`, ...) which raced
trunk on `VERSION`, accumulated 8-file conflicts at merge time, and
weren't torn down. ADR-0002 said "branches are transport, not feature
workspace" but only as prose — tooling did not enforce it. R2 makes
the long-lived branch shape **structurally impossible** at pre-commit.

**Category:** A — Enforced (regex + marker + age gates + freeze-table).
**Defined in:** `docs/adr/0017-transport-branch-enforcement.md`,
`.claude/CLAUDE.md` (Enforced rules section).
**Owner script(s):** `scripts/checks/transport-branch-check.mjs`,
pure-logic library `scripts/lib/transport-branch.mjs`.
**Pre-commit phase:** 2.7 — non-skippable.
**Coa-merge integration:** transport-mode in `scripts/coa-merge.mjs`
auto-detects `tx-*`, writes `.claims/.coa-merging.lock` marker before
ceremony, ff-merges into trunk, removes marker on success.
**Test surface:** `tests/unit/transport-branch.test.mjs` (77 cases),
`tests/integration/transport-branch-check.test.mjs`,
`tests/integration/coa-merge-transport.test.mjs`.
**Cross-references:** R1 (Phase 2.5 sits next to 2.7), R4 (audit
recognizes tx-* branches), R8.2 (hook integrity, TPL-256 — Phase 1.0
fires before both 2.5 and 2.7).

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | `git checkout -b feature-xyz` then commit | pre-commit Phase 2.7 refuses non-trunk non-tx branches with banned-pattern error pointing at `coa-worktree --create --slice=` | — | exists (integration test 3 in transport-branch test suite) |
| 2 | `git checkout -b tx-FAKE-999` to fake transport on a code-only commit | regex passes BUT no marker → ceremony files refused; non-ceremony commits allowed (correct outcome — fake branch buys nothing) | — | exists (integration tests 7/8/12) |
| 3 | Set `COA_MERGING=1` env to bypass marker check | marker is file + JSON + PID match; no env override exists | — | exists (code review of `checkMarker()`) |
| 4 | Manually write marker file with own PID | marker validated against caller's parent-PID chain; checker can't be its own parent | platform-dependent — soft-pass when `ps`/`wmic` unavailable; R8.2 (TPL-256) closes from different angle (tampered hook caught) | partial — exists (integration test 13) but soft-pass on systems without ps |
| 5 | Bypass pre-commit with `--no-verify` | R8.2 (hook integrity, TPL-256) — pre-push Phase 1.0 catches tampered pre-commit; documented gap in ADR-0017 | — | partial — see CG-R2-1 |
| 6 | Squash branch's commits + `git push --force` to main directly | sanctioned path through coa-merge requires marker + rebase + commit; raw force-push to main is a separate trust boundary (operator's git remote permissions) | network-side branch protection at remote | discipline — see CG-R2-2 |
| 7 | Rename main to bypass branch check | `isTrunkBranchName` accepts only `main` / `master`; renamed-main commits fail Phase 2.7 | — | exists (unit tests 19-23) |
| 8 | Modify `transport-branch-check.mjs` to weaken regex | self-test runs FIRST in pre-commit, pinned accept/reject names; file is in `protectedPaths`; banlist is `Object.freeze`-d (mutation throws) | — | exists (self-test + protectedPath + Object.freeze unit test 37) |
| 9 | Add a banlist exemption | `BANNED_BRANCH_PATTERNS` is `Object.freeze`-d; mutation throws | — | exists (unit test 37) |
| 10 | Old `--name=` worktree to skip `--slice=` | deprecation warning emitted on stderr; `--name=` path doesn't choose tx-* branch, so a `--name=` worktree only contributes commits if the operator switches to main inside it (where R2 doesn't object) — transitional gap by design | full removal of `--name=` queued for a future slice | gap — see CG-R2-3 |
| 11 | Set `marker.ts` to the future to evade staleness check | age check rejects negative ages too (`age < 0` → refuse); clock-skewed marker can't slip | — | exists (unit case for negative-age branch) |
| 12 | Run two coa-merge concurrently to race the marker | second sees existing marker (mutex); branch mismatch OR PID mismatch refuses | — | exists (integration test 25) |
| 13 | Reuse marker after coa-merge crashes mid-flow | `process.on('exit', cleanupMarker)` removes on any exit; staleness check is second line of defense | — | exists (code in `coa-merge.mjs`) |
| 14 | **F12 (open) — transport-mode `git update-ref` leaves main worktree desync'd from HEAD** | recovery via `git restore --staged . && git checkout HEAD -- .`; **TPL-237 candidate** patches the ceremony to also force-sync the main worktree | TPL-237 (not yet landed at v0.7.40) | gap (active) — see CG-R2-4; tracked separately as TPL-237 |
| 15 | Transport branch goes >168h old (refuse threshold) but operator wants one more commit to finish | `--really` + `COA_OPERATOR=1` override path | — | exists (TPL-225 model reused) |
| 16 | Modify `MERGING_MARKER_MAX_AGE_MS` to grant longer staleness window | constant exposed by name; unit suite pins `=== 5*60*1000`; weakening fails CI | add explicit "weakening fails CI" meta-test | partial — see CG-R2-5 |
| 17 | Symlink `.coa-merging.lock` to a marker in another repo | marker path is resolved against `mergingMarkerPath(repoRoot)` returning an absolute path under `<repoRoot>/.claims/`; symlink would still need correct branch + PID + age — no shortcut | — | exists (path resolution + content validation) |

### Test coverage gaps

- **CG-R2-1** — R8 (hook integrity) planned slice would close `--no-verify` bypass. Add a CI-only assertion that pre-commit hooks can't be skipped in CI.
- **CG-R2-2** — Document that branch protection at the git remote (GitHub branch protection) is the second-layer defense; not enforceable from this repo.
- **CG-R2-3** — Test that asserts `coa-worktree --create --name=` emits the deprecation warning (helps detect silent removal of the warning).
- **CG-R2-4** — TPL-237 ceremony patch: after `git update-ref`, force main-worktree sync via `git restore --staged . && git checkout HEAD -- .` (or equivalent). Track in F12 entry.
- **CG-R2-5** — Meta-test that `MERGING_MARKER_MAX_AGE_MS === 300000` (5 min). Weakening should fail CI.

---

## R4 — Worktree lifecycle (audit / refresh / teardown)

**Statement.** The operator must always be able to run a single command
(`coa-worktree --audit`) and learn each worktree's state with a verdict
naming the safe next action. Cleanup primitives must distinguish
"stamp-only residue" (safe to discard) from "user WIP" (must preserve)
and refuse to act when uncertain.

**Why.** On 2026-04-28 the Zvenix repo accumulated four simultaneous
worktrees with no automated way to see which were merged, which had
real WIP versus stamp-only residue, or which had drifted. Without
visibility, worktrees accumulate. Without safe primitives, even visible
stale ones are dangerous to remove (force-remove + branch-D can lose
WIP). R4 closes the gap.

**Category:** A — Enforced (operator-gated mutations + frozen verdict
table + conservative classifier).
**Defined in:** `docs/adr/0016-worktree-lifecycle.md`.
**Owner script:** `scripts/coa-worktree.mjs`.
**Pure-logic libs:** `scripts/lib/worktree-audit.mjs` (verdict
classifier), `scripts/lib/worktree-refresh.mjs` (stamp-only diff
classifier).
**Test surface:** `tests/unit/worktree-audit.test.mjs`,
`tests/unit/worktree-refresh.test.mjs` (28 diff cases),
`tests/integration/coa-worktree-lifecycle.test.mjs` (23 scenarios),
`tests/integration/coa-worktree-teardown.test.mjs` (11 scenarios, TPL-285).
**Operator gate:** `--teardown-stale --execute` requires
`COA_OPERATOR=1` + a matching dry-run marker (sha256 candidate-set hash)
+ append to `.claims/audit.log`.
**`--include-dirty` escape hatch (TPL-312 / ADR-0040):** Operator-gated
extension widening eligibility to merged-but-dirty verdicts
(`stale-merged-with-wip`, `stale-merged-with-stamp-residue`) so
accumulated `tx-*` worktrees that Step 9e correctly preserved can be
bulk-cleaned in one invocation. Requires `COA_OPERATOR=1` plus the
explicit `--include-dirty` CLI flag (no env-only bypass) plus a marker
from a matching `--dry-run --include-dirty` (the marker hash includes
the flag, so a clean dry-run cannot authorize a dirty execute).
Ancestor-check (merged-only) safety preserved — unmerged divergent
verdicts remain ineligible. Dirty teardowns emit a distinct
`worktree-teardown-dirty` audit event with a `dirty_status_summary`
field. Motivated by ZVX-DEV-130's 10+ accumulated dirty `tx-*`.
**`--teardown` branch cleanup (TPL-285 / ADR-0023):** After a successful
`git worktree remove`, `--teardown` deletes the local branch ref via
strict `git branch -d` (never `-D`). Merged branches are deleted silently;
unmerged branches are preserved with a warning and the operator can run
`git branch -D <name>` manually if intentional. Detached-HEAD or
already-deleted branch refs are silently skipped. Closes the manual
cleanup gap surfaced in AIC-DEV-142.
**Cross-references:** R1 (every R4 integration test uses `safeGit`),
ADR-0009 (slim-header window for stamp-only classifier),
ADR-0014 (`@version` last-content-change),
TPL-225 (operator-gate model reused),
TPL-283 / ADR-0021 (after coa-merge step 9c ff-merge, step 9e auto-tears-down
provably-merged tx-* branches via strict `--is-ancestor` check with no
operator gate — distinct from R4's heuristic-based `--teardown-stale --execute`
which remains for non-ancestor stale branches and stamp-residue cleanups),
TPL-285 / ADR-0023 (strict branch-ref cleanup in `--teardown`),
TPL-315 / ADR-0041 (nested-worktree protection — worktrees nested inside the
repo root, and any worktree whose basename is in `KNOWN_INFRA_BASENAMES`
(e.g. `.cockpit-stable`), classify as `clean-active` and are never eligible
for `--teardown-stale`, including under `--include-dirty`).

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Run `--teardown-stale --execute` without prior `--dry-run` | marker file required; matched by candidate-set hash | — | exists (integration test 18) |
| 2 | Set `COA_OPERATOR=1` in agent shell | COA harness does not propagate `COA_OPERATOR` to agent runs by default; same model as TPL-225 | — | exists (integration test 17) |
| 3 | Refresh silently discards logic-changed files | `classifyDiff` errs conservative across 28 unit-tested edge cases (whitespace, CRLF, pure-add, pure-delete, rename, mode change, malformed hunks, mixed @version+logic, out-of-window hunks) | — | exists (28 unit cases) |
| 4 | Pass arbitrary path to `--refresh` or `--teardown-stale` | path resolved against `git worktree list --porcelain`; non-matches return `not found` | — | exists (integration test 13) |
| 5 | Run `--refresh` from cwd inside the target worktree | `isCwdInside(process.cwd(), record.path)` check before any mutation | add explicit integration test for the cwd-inside guard | partial — see CG-R4-1 |
| 6 | Tamper with stamp-only classifier (`SLIM_HEADER_RANGE = 10`) | classifier invariants pinned by 28-case unit suite; constant exposed by name and asserted | — | exists |
| 7 | Delete `worktree-refresh.mjs` and reroute through weaker check | named import via `./lib/worktree-refresh.mjs`; node module resolution fails loudly; both lib files are in `protectedPaths` | — | exists |
| 8 | Force teardown of worktree with active claim | `findClaimReferencingBranch` scans `.claims/*.json` for `status: active` matching `slice`/`notes`/`targets`; match → `claim-active` ineligibility | — | exists (integration test 22) |
| 9 | Race a claim into existence between dry-run and execute | `--execute` re-runs claim check at the moment of teardown; mid-flight claim → `failures` not `torn` | — | exists (`runTeardownStale --execute` re-checks) |
| 10 | Bypass the audit log | append happens BEFORE `git worktree remove`; append failure aborts that candidate (atomic guarantee) | — | exists (integration test 21) |
| 11 | Reuse dry-run marker for different candidate set | marker hashed by sorted candidate-path set; any change invalidates hash | — | exists (`hashCandidateSet`) |
| 12 | Reuse marker after teardown | marker `rmSync`-ed after `--execute`; second invocation finds no marker | — | exists |
| 13 | Modify `VERDICTS` table to misclassify | `Object.freeze`-d; mutation throws; unit suite asserts frozen status + 8 tags | — | exists (`VERDICTS table is frozen` test) |
| 14 | Move audit log to a path the operator cannot see | path is `<repoRoot>/.claims/audit.log` — same as `claim-check`; relocation requires ADR change | — | exists (constant in script + ADR) |
| 15 | Pass a dry-run marker file from an attacker via symlink | marker contents validated as JSON with required fields + hash + ts; symlink to attacker file would need correct hash + recent ts | full path resolution check (resolved-must-equal-expected) | partial — see CG-R4-2 |
| 16 | Race a dirty mutation into a candidate between dry-run and execute | `--execute` re-audits each candidate; gained dirty state → reject | — | exists (re-audit invariant) |
| 17 | Use `--include-dirty` to bypass ancestor-check and force-remove unmerged work | eligibility widens only to merged verdicts; re-audit at execute also asserts `fresh.isMerged`; clean dry-run marker excluded by hash salt; CLI flag required (no env-only) | — | exists (TPL-312 integration tests 1–7) |
| 18 | Tooling drops a clean nested worktree (e.g. Cockpit's `.cockpit-stable`) inside the repo and `--teardown-stale` deletes it as `clean-merged` | `classifyVerdict` collapses `nested + clean` and `nested + known-infra-basename (any dirt)` to `CLEAN_ACTIVE` up front (TPL-315 / ADR-0041); `KNOWN_INFRA_BASENAMES` allowlist (`{.cockpit-stable}`) protects against post-merge rebuild dirt; `--include-dirty` does NOT widen to `CLEAN_ACTIVE` | — | exists (TPL-315 integration cases 1–5 + 5 classifier units) |

### Test coverage gaps

- **CG-R4-1** — Spawn a child process with cwd inside the target worktree, run `--refresh`, assert refusal. Currently only audited via reasoning + classifier coverage.
- **CG-R4-2** — Test that a symlinked marker file is rejected (or the symlink target is what's resolved); `realpathSync` on marker path would close.
- **CG-R4-3** — Test that an audit-log corruption mid-flight (e.g., truncate during write) results in transactional rollback. Today's `appendFileSync` is atomic on POSIX; Windows may differ.

---

## R5 — Main-worktree guard

**Owner:** `scripts/checks/main-worktree-guard.mjs`
**ADR:** `docs/adr/0018-main-worktree-guard.md`
**Pre-commit phase:** 0 (non-skippable)

### Intent

Block `git commit` when the working directory is the main repo worktree rather
than a transport worktree. Enforces "all feature work travels through
coa-worktree + coa-merge" at the git level.

### R5 Whitehack — evasion vectors (TPL-276)

| Vector | Closed by |
|---|---|
| Direct `git commit` in main worktree | Phase 0 blocks |
| `COA_SKIP_GATES=0 git commit` | Phase 0 is in NON_SKIPPABLE_PHASES |
| `--no-verify` | Same as all rules — operator awareness + Phase 8 audit |
| Path containing `-tx-` for unrelated reasons | Uppercase-char-after-`-tx-` regex reduces false negatives |
| `COA_OPERATOR=1` bypass | Intentional; logs WARNING; tracked by Phase 8 audit |

**Test coverage:** `tests/unit/main-worktree-guard.test.mjs`

---

## R6 — Merge-ceremony drift detection (6-check post-hoc audit)

**Statement.** The merge ceremony must leave no detectable drift in 6 areas:
(1) a snapshot must exist in `.backups/` for the current VERSION; (2) the
`.coa-merging.lock` ceremony marker must not be stale (dead PID or age >5 min);
(3) CHANGELOG.md must have no duplicate version headings or heading-level slice
IDs in adjacent sections; (4) linked worktrees with HEAD diverged from trunk for
>24 hours must be flagged; (5) scripts and phases referenced in
`docs/guides/merge-ceremony.md` must exist on disk and in the pre-commit hook;
(6) commits touching protected paths must have corresponding claim lifecycle
events in `.claims/audit.log` within ±120 seconds.

**Why.** Several real incidents motivated these checks collectively:
- Check 1 (snapshot): linked-worktree snapshot production puts `.backups/` in the
  wrong path; snapshot is invisible from the main worktree (2026-05-03 learning).
- Check 2 (stale lock): an interrupted coa-merge can leave `.coa-merging.lock`
  orphaned, blocking the next ceremony's PID validation.
- Check 3 (CHANGELOG uniqueness): a Cockpit 2026-05-03 incident where coa-merge
  was interrupted and restarted, producing two `## [0.7.44]` sections with
  different content.
- Check 4 (worktree divergence): after R2 ff-merge, linked worktrees are not
  automatically torn down; accumulated stale worktrees cause confusion.
- Check 5 (doc completeness): a ceremony guide that references deleted or renamed
  scripts becomes misleading and breaks operator follow-along.
- Check 6 (audit-log correlation): a `--no-verify` bypass (CG-R2-1) leaves
  protected-path commits without audit trail; Check 6 is the independent
  post-hoc detector that catches this even when pre-commit was skipped.

**Category:** A — Enforced (warn-only initially; promotion to hard-error tracked
in CG-R6-1).
**Defined in:** `docs/guides/merge-ceremony.md`, this registry entry (TPL-245).
**Owner script:** `scripts/checks/merge-ceremony-drift-check.mjs`.
**Pre-commit phase:** 8 — skippable (warn-only; NOT in `NON_SKIPPABLE_PHASES`).
**Test surface:** `tests/checks/merge-ceremony-drift-check.test.mjs` (20 tests,
6 checks × positive + negative + edge cases).
**Cross-references:** R2 (Check 2/4/6 complement R2 marker + audit invariants),
R4 (Check 4 overlaps with worktree lifecycle), H2 (Check 5 validates doc
references), T2 (Check 3 CHANGELOG integrity).

### Check index

| # | Check | Drift detected |
|---|---|---|
| 1 | Snapshot presence | `merge-*VERSION*` file missing from `.backups/` |
| 2 | Stale lock marker | `.coa-merging.lock` with dead PID or age > 5 min |
| 3 | CHANGELOG section uniqueness | Duplicate `## [X.Y.Z]` headings or heading-level IDs in adjacent sections |
| 4 | Worktree HEAD divergence | Linked worktree HEAD ≠ main branch for > 24 h |
| 5 | Ceremony doc completeness | Script referenced in merge-ceremony.md doesn't exist, or phase number not in pre-commit |
| 6 | Audit-log correlation | Commit touching VERSION/CHANGELOG.md/package.json/.githooks/* has no matching claim event within ±120s |

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Produce snapshot from inside a linked worktree instead of main worktree | Check 1 reads `.backups/` relative to `git rev-parse --show-toplevel`, which is the linked worktree root — snapshot goes to wrong path; Check 1 warns when run from main | document "run pnpm mergezip from main worktree" as hard operator requirement; Check 1 is the audit trail | exists (negative test: missing snapshot) |
| 2 | Delete `.coa-merging.lock` manually after interrupting ceremony | lock removal doesn't mean ceremony completed — the commit either happened or it didn't; Check 2 detects stale/dead lock, not that the lock was correctly removed | no bypass path for "lock was manually deleted but ceremony unfinished" — Check 2 is a heuristic, not a guarantee | exists (negative test: stale ts, dead PID) |
| 3 | Duplicate `## [X.Y.Z]` in CHANGELOG by editing file directly | Check 3 detects identical version headings; adjacent-section heading-level IDs catch split-ceremony | pre-commit `changelog-sync.mjs` (Phase 7) also validates; two independent checks | exists (negative test: duplicate version heading) |
| 4 | Keep a diverged worktree "active" by touching a file (defeats age heuristic) | Check 4 reads mtime of `.git/worktrees/<name>/HEAD`; updating a file in the worktree does NOT update that HEAD file — only a new commit would | coa-worktree audit is the complementary tool; R4 addresses this from the lifecycle angle | exists (positive test: no stale worktrees) |
| 5 | Update `docs/guides/merge-ceremony.md` to reference a script that exists but does the wrong thing | Check 5 only tests existence, not correctness; the referenced script must be reviewed by a human | code review is the defense; Check 5 stops the accidental "script was renamed" class | exists (negative test: nonexistent script) |
| 6 | Use `--no-verify` (or `COA_SKIP_GATES=1`) to bypass pre-commit entirely — no claim event is created | Check 6 is completely independent of the pre-commit hook; it reads git history and the audit log separately; a skipped pre-commit produces no claim events, causing Check 6 to warn | Check 6 is the companion for CG-R2-1; makes `--no-verify` detectable after the fact | exists (negative test: commit without audit entry) |

### Test coverage gaps

- **CG-R6-1** — Promote `merge-ceremony-drift-check.mjs` to hard-error (`--enforce`,
  add to `NON_SKIPPABLE_PHASES`) after 2-week warn-only stabilization period.
  **Size:** tiny. **Dependencies:** clean run on trunk for 14 days.
- **CG-R6-2** — Extend Check 6 to `--full-history` mode scanning all commits (not
  just last N), for deep forensic audits. **Size:** small. **Dependencies:** none.

---

## C1 — Claims protocol — modify/replace conflict blocking

**Statement.** Two agents cannot simultaneously hold `modify` or
`replace` claims on the same target path. The pre-commit hook refuses
commits that stage paths covered by another agent's active claim.

**Why.** ADR-0008 — without claim-based coordination, parallel sessions
silently overwrite each other's work. The `modify`/`replace` action
states are the load-bearing distinction: `extend`-on-`extend` overlap
is allowed (additive co-edits); anything else blocks.

**Category:** A — Enforced.
**Defined in:** `docs/adr/0008-inter-agent-coordination-protocol.md`,
`.claims/README.md`.
**Owner script:** `scripts/checks/claim-check.mjs --enforce --staged`.
**Pre-commit phase:** 3.
**Test surface:** `tests/checks/claim-check.test.mjs`,
`tests/integration/claim-check-collision-rehearsal.test.mjs`.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Stage a file without filing a claim | Phase 3 enforce mode flags every staged path against active claims | — | exists (collision-rehearsal test) |
| 2 | File a `extend` claim then stage a `replace`-like change | action mismatch is not auto-detected; reasonable agents file `modify` for actual modification | content-aware action inference (see CG-C1-1) | gap |
| 3 | Stage shared-infra without claim coverage | protectedPaths produces advisory warning today; not blocking by default | promote to block via `protectedPathMode: "block"` (already set in config) | exists — config is `block` |
| 4 | Race a claim creation into existence at the moment of commit | `--acquire` is atomic check-and-create; pre-commit reads point-in-time | — | exists (acquire atomicity tested) |
| 5 | Forge an active claim file | claims are user-writable JSON; integrity is by convention not signature; an attacker with repo write can manipulate | claim-signing (see CG-C1-2; aspirational, requires keys) | gap |
| 6 | Use `--query` to check, then stage just before another agent's `--acquire` | TOCTOU window exists; prefer `--acquire` over `--query`+stage | — | discipline — documented in CLAUDE.md |
| 7 | File a claim with `targets` that don't match staged paths | enforcement matches staged paths against claim targets — non-matching claims don't grant coverage | — | exists |

### Test coverage gaps

- **CG-C1-1** — Action-inference test: if a claim is `extend` but the staged change is a deletion (replace-shaped), warn loudly.
- **CG-C1-2** — Document the claim-forgery vector explicitly. Mitigation requires a signing key system; aspirational only.
- **CG-C1-3** — Race test: spawn two `--acquire` commands concurrently for overlapping targets; assert exactly one succeeds.

---

## C2 — Claims auto-expire stale claims

**Statement.** Claims past `expires` automatically transition to
`status: "expired"` on the next `--auto-expire` run. Stale claims
do not block other agents.

**Why.** Without automatic expiry, abandoned sessions hold locks
indefinitely. Pre-commit Phase 3 runs `--auto-expire` before
`--enforce`, so the next commit sees a clean coordination state.

**Category:** A — Enforced.
**Owner:** `scripts/checks/claim-check.mjs --auto-expire`.
**Pre-commit phase:** 3.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Set `expires` far in the future to evade auto-expire | `MAX_TTL_HOURS=168` caps TTL at 7d; longer values are clamped | — | exists (cap test) |
| 2 | Repeatedly `--extend` to keep a claim alive | `--extend` is same-agent only; auto-extend in coa-merge is also same-agent | — | exists |
| 3 | Set system clock backwards to keep claim "young" | claim-check reads system clock; OS-level clock manipulation is out of scope | OS-level mitigation only | discipline |
| 4 | Modify `MAX_TTL_HOURS` constant | exposed by name; weakening would fail any CI test that asserts the constant value | add meta-test pinning the constant | partial — see CG-C2-1 |

### Test coverage gaps

- **CG-C2-1** — Meta-test that `MAX_TTL_HOURS === 168` and `MAX_TARGETS === 100` (unified across Template/Cockpit/Zvenix, TPL-330).

---

## C3 — Protected paths require claim coverage

**Statement.** Modifications to paths listed in `.claims/config.json
protectedPaths` (CHANGELOG.md, VERSION, package.json, .githooks/*,
.claude/CLAUDE.md, etc.) require an active claim covering the path.

**Why.** These are shared-infra files; uncoordinated edits
silently lose data. Bumping VERSION without a claim races every
parallel session that reads VERSION.

**Category:** A — Enforced (mode: `block`, not `warn`).
**Owner:** `claim-check.mjs --enforce` consults `.claims/config.json`.
**Test surface:** indirect via collision-rehearsal tests + protectedPath
coverage assertions.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Edit a protectedPath without a claim | pre-commit Phase 3 refuses with `protected-path-uncovered` reason | — | exists (collision-rehearsal includes protected-path scenarios) |
| 2 | Match by glob trick — `.claims/config.json` lists `**/*.md` style | **Field finding:** claim-check matches **literal paths** despite supporting globs; meta-tests must use literal-path inventory not config-glob expansion (per memory `claim_check_literals.md`) | document the literal-path matching invariant prominently in `.claims/README.md` | gap — see CG-C3-1 |
| 3 | Drop a path from protectedPaths in a regular commit | `.claims/config.json` is itself in `protectedPaths` → recursive lock | — | exists (recursive entry verified) |
| 4 | Edit `.claims/config.json` via separate claim | requires an explicit claim; review of the claim is the audit trail | — | exists (process-level) |
| 5 | Write to a path through a script that opens it via `fs.writeFile` instead of git mutation | claim-check operates on staged paths only; a runtime mutation that doesn't `git add` the file isn't blocked, but also doesn't end up committed | — | exists by definition |
| 6 | `MAX_TARGETS` allows ≤100 paths, but a claim could try `[]` to "cover everything" | empty target list is rejected | — | exists |

### Test coverage gaps

- **CG-C3-1** — Meta-test that asserts every entry in `.claims/config.json#protectedPaths` is matchable by the claim-check matcher (literal path or expanded glob list inventory). Closes the silent-removal of a protectedPaths line vector.

---

## C4 — Slice ID uniqueness invariant

**Statement.** No two claims (active OR committed) within a repository may
share the same `slice` value. `claim-check --acquire --slice=<ID>` refuses
when `<ID>` matches an existing active claim's `slice` field OR appears in
any commit subject across `git log --all --grep="(<ID>)"`. A slice ID is
permanently retired once a commit uses it — auto-expiry of a claim frees the
ID only if no commit has landed with that ID.

**Why.** Four documented collisions in Wave A/B (AIC-DEV-135, AIC-DEV-136,
AIC-DEV-137, ZVX-DEV-068) resulted in ambiguous git history and broken audit
trails. The fix is an early-bind atomic acquire-time check — slice IDs, unlike
VERSION, are not derived from HEAD state, so a lock-at-acquire-time model is
sufficient.

**Category:** A — Enforced.
**Owner scripts:** `scripts/checks/claim-check.mjs --acquire` (acquire-time) + `scripts/checks/commit-msg-check.mjs` (commit-time).
**ADRs:** `docs/adr/0020-slice-id-uniqueness.md` (C4 foundation) + `docs/adr/0025-commit-msg-slice-coverage.md` (CG-C4-1 closure) + `docs/adr/0029-coa-worktree-auto-pick.md` (auto-pick mode) + `docs/adr/0030-commit-msg-recent-completed-claims.md` (Layer 1.5 / pre-commit ordering fix) + `docs/adr/0031-history-match-tightening.md` (Layer 2 explicit-override-only) + `docs/adr/0036-acquire-recent-completed-window.md` (acquire-time Layer 1.5 / TPL-306 race window closure).
**Wired in:** `scripts/coa-worktree.mjs --create` (acquire — explicit or auto-pick) + `.githooks/commit-msg` (coverage check).

### Auto-pick mode (TPL-280 / ADR-0029)

`coa-worktree --create` without `--slice=` or `--name=` now **auto-picks** the
next-free ID by scanning git history + active claims, then atomically acquiring
the claim. Bounded retry (5 attempts) handles the race between scan and acquire.
This eliminates the manual verify-and-rollforward protocol (8 steps in the worst
observed Cockpit case). Dispatch prompts no longer need to pre-pick a slice ID.

### Enforcement layers

| Layer | Owner | Trigger | Closes |
|-------|-------|---------|--------|
| 0 — auto-pick selection | `autoPickNextSliceId` + `claim-check --acquire` | `coa-worktree --create` (default, no --slice) | operator toil; stale-ID in dispatch prompts |
| 1 — acquire-time uniqueness | `claim-check --acquire` | `coa-worktree --create --slice=X` | collisions via --acquire path |
| 1.5 — acquire-time recently-completed | Layer 1.5 in `claim-check --acquire` | `coa-worktree --create` (auto-pick or explicit) | **TPL-306 race**: pre-commit `--auto-complete` flips claim → `completed`, but commit not yet on HEAD; second session's auto-pick saw neither active claim nor history match (TPL-308 / ADR-0036) |
| 2 — pre-commit enforce | `claim-check --enforce` | pre-commit Phase 3 | protectedPaths overlap only |
| 3 — commit-msg coverage | `commit-msg-check.mjs checkSliceCoverage` | `.githooks/commit-msg` | **CG-C4-1** — manual `git checkout -b tx-X` bypass |
| 3.5 — recently-completed window | Layer 1.5 in `checkSliceCoverage` | same hook | pre-commit auto-complete vs commit-msg ordering race (TPL-293 / ADR-0030) |
| 3.6 — history-match explicit-override-only | Layer 2 in `checkSliceCoverage` (tightened TPL-299 / ADR-0031) | same hook | **subject-reuse via silent history-match** (TPL-288 dual-commit + ZVX-DEV-111 dual-commit) |

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Test status |
|---|---|---|---|
| 1 | `claim-check --acquire --slice=X` when active claim with slice=X exists | refuse with `slice-id-collision: active claim ...` | exists |
| 2 | `claim-check --acquire --slice=X` when commit with `(X)` in subject exists in history | refuse with `slice-id-collision: slice=X already used in commit ...` | exists |
| 3 | Manual `git checkout -b tx-X` bypassing claim-check at create time | `commit-msg-check` refuses orphan slice ID at commit time — active-claim or history match required (ADR-0025) | exists (TPL-281) |
| 4 | Two parallel `coa-worktree --create --slice=X` race | `claim-check --acquire` uses `acquireLock` (file-based O_EXCL semantics); only one wins | exists (integration test) |
| 5 | `--allow-id-collision` bypass without operator env | gated by `COA_OPERATOR=1`; absent env fails at pre-flight | exists |
| 6 | Slice ID appears in commit body/sidecar but not subject | spec is "subject only" — `git log --grep` matches subject by default; body/sidecar are advisory. Documented in ADR-0020. | exists (documented) |
| 7 | Active claim with slice=X expires, second session retries X, commits → history blocks future retry | history check covers all branches; claim expiry alone does not retire the ID once committed | exists |
| 8 | `COMMIT_MSG_ALLOW_ORPHAN_SLICE=1` without `COA_OPERATOR=1` (single-key bypass) | both keys required; single key is refused | exists (TPL-281) |
| 9 | Check from tx-worktree sees empty `.claims/` (untracked files not shared) | `resolveMainRepoRoot()` via `git rev-parse --git-common-dir` finds main repo root; all claim-aware tools fixed (TPL-288 / ADR-0027) | exists (TPL-288) |
| 10 | Two parallel auto-picks grab same candidate between scan and acquire | bounded retry (5 attempts); each attempt re-increments so both sessions land on different IDs | exists (T4 in auto-pick test) |
| 11 | `--slice=` + `--auto-pick` passed together | refused: "mutually exclusive" error before any git operation | exists (T6 in auto-pick test) |
| 12 | Subject reuse via history-match silent INFO pass — two unrelated commits share same slice ID (TPL-288 dual-commit + ZVX-DEV-111 dual-commit) | Layer 2 tightened (TPL-299 / ADR-0031): history match → orphan by default; `COA_OPERATOR=1 + COMMIT_MSG_ALLOW_HISTORY_MATCH=1` required for explicit-fixup-override; every override writes audit log entry | exists (commit-msg-check-history-tightened.test.mjs) |
| 13 | Race between pre-commit `--auto-complete` (claim status flip) and commit landing on HEAD — second session auto-picks the same slice ID because Layer 1 (active) and Layer 2 (git log) both miss during the gap (Wave Q TPL-306 dual-commit) | Acquire-time Layer 1.5 (TPL-308 / ADR-0036): refuse acquire when claim with matching slice has `status="completed"` AND `completed_at` within 60s window (configurable via `CLAIM_ACQUIRE_RECENT_WINDOW_S`); reuses `findRecentClaimWithSlice` from TPL-298; symmetric with commit-msg Layer 1.5; audit log entry on every refusal; `--allow-id-collision` + `COA_OPERATOR=1` bypasses all 3 layers | exists (claim-check-acquire-recent-completed.test.mjs) |

### Layer 2 (commit-msg-check) — history-match explicit-fixup-override only (TPL-299 / ADR-0031)

Prior to TPL-299, a history match (prior commit with `(sliceId)` in subject) granted silent
`ok=true` with reason `history-commit` and an INFO log line. This allowed two unrelated commits
to share the same slice ID in their subject line, damaging the audit trail:

- **TPL-288**: Another aggregator's Sonnet kept `(TPL-288)` in the subject of a tx-TPL-296
  worktree commit — acquire-time correctly refused the slice, but commit-msg accepted via history match.
- **ZVX-DEV-111**: Igor's `603eaeb48 fix(kanban): blocker panel...` landed first; a Wave L Sonnet
  TPL-280 backport also committed `(ZVX-DEV-111)` — second commit passed via history match.

**Fix:** history match → `slice-id-orphan` by default. Dual-key override
(`COA_OPERATOR=1 COMMIT_MSG_ALLOW_HISTORY_MATCH=1`) allows the pass with:
- reason `history-fixup-override` (distinguishable from normal coverage)
- a JSON Lines audit entry written atomically to `.claims/audit.log`
  (`{ ts, event: "commit-msg-history-fixup-override", slice, matched_commit, subject, operator_override_active: true }`)
- a WARN log (not silent INFO) in the commit-msg hook output

**Legitimate fixup workflow** (adding a file missed in a prior commit) should use a **new slice ID**
with `Refs <orig-id>` in the commit body. The dual-key override is reserved for rare cases where the
operator consciously chooses subject reuse and accepts the audit trail note.

### Layer 1.5 (acquire-time) — recently-completed claim refusal (TPL-308 / ADR-0036)

The Wave Q TPL-306 dual-commit incident exposed a race window symmetric to the
TPL-293 / ADR-0030 finding but at the **acquire** boundary instead of the
commit-msg boundary:

1. Session A's pre-commit Phase 3 runs `claim-check --auto-complete --staged` —
   claim status flips `active` → `completed` with `completed_at=<now>`.
2. Pre-commit phases 4–7 run (seconds).
3. Commit-msg hook fires; Layer 1.5 (TPL-298 / ADR-0030) accepts via
   recently-completed.
4. The git commit object is finally written to HEAD.

Between step 1 and step 4, Session B running `coa-worktree --create` (auto-pick
or explicit `--slice=TPL-306`) saw:

- No active claim with `slice="TPL-306"` (it was already completed).
- No commit with `(TPL-306)` in `git log --all --grep` (commit not yet on HEAD).

Both checks passed → Session B acquired the same slice → trunk gained two
`(TPL-306)` commits.

**Fix:** acquire-time Layer 1.5 inserted between the active-claim check and
the history check. Reuses `findRecentClaimWithSlice` (TPL-298) with default
window 60s (matches ADR-0030); env override `CLAIM_ACQUIRE_RECENT_WINDOW_S`.
Refusal writes JSON Lines audit event:

```json
{ "ts": "<ISO>", "event": "claim-acquire-recent-completed-refuse",
  "slice": "<id>", "matched_claim": "<clm-id>",
  "completed_at": "<ISO|null>", "window_seconds": 60 }
```

The existing `--allow-id-collision` + `COA_OPERATOR=1` operator override
bypasses all three layers (active, recently-completed, history) — preserved
unchanged so the escape valve remains a single universal switch.

### Worktree-aware claims discovery (TPL-288 / ADR-0027)

Linked git worktrees do not share untracked files. Active claims created by
`coa-worktree --create` live in the **main repo's** `.claims/`. Tools that
resolved `.claims/` relative to `process.cwd()` or the script location saw an
empty directory when invoked from a tx-worktree.

**Fix:** `resolveMainRepoRoot(worktreeRoot)` in `scripts/lib/fs-helpers.mjs`
uses `git rev-parse --git-common-dir` to find the shared `.git` dir and derives
the main repo root from its path (`dirname`). All claim-aware tools now use this
helper for `CLAIMS_DIR` resolution. See ADR-0027 for the full audit table.

### Test coverage gaps

*(none — CG-C4-1 closed by TPL-281 / ADR-0025; vector 9 closed by TPL-288 / ADR-0027; vectors 10-11 closed by TPL-280 / ADR-0029; pre-commit-ordering race closed by TPL-293 / ADR-0030; vector 12 / subject-reuse closed by TPL-299 / ADR-0031; vector 13 / acquire-time race window closed by TPL-308 / ADR-0036)*

---

## C5 — Changelog version uniqueness invariant

**Statement.** No two `## [<version>]` headings in CHANGELOG.md may share the
same `<version>` string. Enforced by five independent layers:
1. `changelog-release.mjs` CLI guard (script idempotency — version-only match).
2. `changelog-sync.mjs --check-uniqueness` (pre-commit Phase 7, non-skippable).
3. `changelog-sync.mjs --check-uniqueness` (pre-push hard-fail).
4. `coa-merge.mjs` step 0 M2 `detectChangelogDuplicates()` pre-flight.
5. `tests/integration/changelog-uniqueness.test.mjs` meta-test.

**Why.** Cockpit AIC-DEV-140 (`81301ae1`) produced two `## [0.9.36]` sections
because `changelog-release.mjs`'s guard included a non-deterministic timestamp
component. A second pre-commit invocation with a different timestamp bypassed the
guard and created a second section. Single-script idempotency is insufficient
because operators and external tools can edit CHANGELOG.md independently; each
independent layer defends a different write vector.

**Category:** A — Enforced.
**Owner scripts:** `scripts/checks/changelog-sync.mjs --check-uniqueness`;
`scripts/coa-merge.mjs` (export `detectChangelogDuplicates`).
**ADR:** `docs/adr/0024-changelog-uniqueness-defense.md`.
**Wired in:** Pre-commit Phase 7 (non-skippable); pre-push hard-fail; coa-merge step 0.

### Whitehack — evasion vectors

| # | Vector | Defense | Test |
|---|---|---|---|
| 1 | Two `changelog-release.mjs` invocations with same `--version` but different timestamps create two sections | Layer 1: version-only `text.includes('## [N]')` guard — idempotent regardless of timestamp | Regression test in `changelog-release.test.mjs` (TPL-286 suite) |
| 2 | Operator manually edits CHANGELOG.md to duplicate a section | Layer 2+3: pre-commit Phase 7 calls `--check-uniqueness`; commit is blocked | Integration test in `changelog-uniqueness.test.mjs` (simulated via unit test of `findDuplicateVersion`) |
| 3 | External tool writes a second section outside of `changelog-release.mjs` | Layer 3+4: pre-push hard-fail before any remote ref update | `changelog-uniqueness.test.mjs` meta-test always reads live file |
| 4 | coa-merge crash-and-retry with corrupted CHANGELOG in working tree | Layer 4+5: coa-merge step 0 `detectChangelogDuplicates()` refuses before ceremony begins | `tests/integration/coa-merge.test.mjs` half-baked scenarios |
| 5 | Regression in layers 1-4 (refactor breaks guard logic) | Layer 6 meta-test: `tests/integration/changelog-uniqueness.test.mjs` reads live CHANGELOG; fails on any run | Permanent always-on test |

### Test coverage gaps

- None identified at TPL-286 landing time.

---

## C6 — Worktree ownership invariant

**Statement.** `coa-merge.mjs` running from a `tx-*` transport branch must be
invoked by the agent that **created** the worktree. The creator identity is
stored in `.coa-session` (written by `coa-worktree --create`). The caller must
declare its identity via `--agent=<name>` or `COA_AGENT` env. A mismatch, absent
identity, or missing `.coa-session` causes step 0.5 to refuse before any
mutation.

**Why.** Zvenix ZVX-DEV-101 incident: Sonnet B cd-ed into Sonnet A's
`tx-ZVX-DEV-101` worktree (after `--create` failed "Branch already exists"),
staged a partial change set (missing `computeSprintCloseSnapshot.ts`), and
committed. Main landed with a broken import. Three recovery commits followed.
The root cause was no guard on foreign worktree entry.

**Category:** A — Enforced.
**Owner:** `scripts/coa-merge.mjs` (step 0.5, exports `verifyWorktreeOwnership`,
`resolveCallerAgent`, `readCoaSession`).
**ADR:** `docs/adr/0034-worktree-ownership.md`.
**Test surface:** `tests/integration/coa-merge-worktree-ownership.test.mjs` (8 cases).
**Override gate:** `COA_OPERATOR=1 COA_ALLOW_FOREIGN_WORKTREE=1` — dual-key,
writes audit entry to `.claims/audit.log`.

### Whitehack — evasion vectors

| # | Vector | Defense | Test |
|---|--------|---------|------|
| 1 | cd into foreign worktree, run `coa-merge` without `--agent` | step 0.5 refuses `agent-unknown` | Case 8 |
| 2 | cd into foreign worktree, supply correct role name but different session | `.coa-session.agent` differs → `agent-mismatch` refuse | Case 2 |
| 3 | Manual `git checkout -b tx-X` bypasses `coa-worktree --create` | no `.coa-session` → `no-active-claim` refuse | Case 3 |
| 4 | Single-key override `COA_ALLOW_FOREIGN_WORKTREE=1` only | second key `COA_OPERATOR=1` missing → `allowForeign=false` → refuse | Case 7 |
| 5 | Dual-key operator override | passes with audit log entry — every override traceable | Case 6 |
| 6 | Delete `.coa-session` before running `coa-merge` | same as Case 3 → `no-active-claim` | Case 3 |
| 7 | Forge `.coa-session` with caller's own agent name | requires write access to foreign worktree; audits remain useful for post-hoc review; full prevention requires filesystem ACL | not yet covered |

### Test coverage gaps

- Case 7 (forged `.coa-session`) is a theoretical vector requiring filesystem access beyond what coa-merge governs. Documented as acknowledged-gap at TPL-304 landing time.

---

## M1 — coa-merge atomicity (J1 deferred mutation + rollback)

**Statement.** `coa-merge.mjs` computes the next VERSION, package.json,
and CHANGELOG.md content **in memory** before writing. If
`git commit` fails (pre-commit phase failure), all three files are
rolled back to HEAD and any auto-staged ceremony files are unstaged.

**Why.** Pre-TPL-222, a failed pre-commit left VERSION bumped on
disk, CHANGELOG sectioned, and package.json updated — but no commit.
The next session inherited the half-baked state and either compounded
it or had to manually back it out. J1 makes ceremony mutation atomic.

**Category:** A — Enforced.
**Defined in:** `docs/backlog/inter-agent-coordination.md` (TPL-222 J1),
`scripts/coa-merge.mjs`.
**Test surface:** `tests/integration/coa-merge.test.mjs` rollback
scenarios.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Manually bump VERSION before invoking coa-merge | J2 pre-flight (M2) detects half-baked state and refuses | — | exists |
| 2 | Crash coa-merge mid-write (between writeFileSync and stage) | J1 deferred-mutation: writes happen at step 7 in tight sequence; failure at step 8 (commit) triggers rollback; failure at step 7 itself leaves disk dirty but the next J2 detects | add atomic-write fence test | partial — see CG-M1-1 |
| 3 | Run two coa-merge concurrently | J5 auto-extend on existing claim; but also: half-baked detection from peer's residue | — | exists (J2 + J5 cover) |
| 4 | Modify `composeReleasedChangelog` to corrupt the [Unreleased] preservation | unit test pins the function; weakening fails CI | — | exists |
| 5 | `kill -9` coa-merge after `git add` but before `git commit` | working tree is left staged; J2 detects on next run; operator-actionable hint emitted | — | exists |

### Test coverage gaps

- **CG-M1-1** — Atomic-write fence: simulate `writeFileSync` failure on the second of three ceremony files; assert the first is rolled back too.

---

## M2 — coa-merge half-baked detection (J2 pre-flight)

**Statement.** Before any new ceremony work, coa-merge checks for
state that indicates a previous run partially completed: VERSION
ahead of HEAD's VERSION, [Unreleased] empty but a versioned section
exists for VERSION, etc. If detected, refuse with copy-pasteable
recovery instructions.

**Why.** TPL-222 J2 — half-baked state is the load-bearing failure
mode for ceremony chains. Detecting it loudly prevents compounding.

**Category:** A — Enforced.
**Owner:** `scripts/coa-merge.mjs` step 0 (pre-flight).
**Test surface:** `tests/integration/coa-merge.test.mjs` half-baked
scenarios.
**Memory cross-ref:** `feedback_half_baked_coa_merge.md` — the
operator preference is "resume or reset cleanly, never overlay your
own ceremony".

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Manually overwrite VERSION to match HEAD before running coa-merge | J2 also checks CHANGELOG state; if [Unreleased] empty but versioned section matches working VERSION, refuses | — | exists |
| 2 | Delete the J4 marker file manually after a crash | J2 still checks disk state; marker is a hint, not the only signal | — | exists |
| 3 | Add a new VERSION+CHANGELOG drift case J2 doesn't recognize | J2's half-baked detection is closed-form (deterministic disk-state predicates); new drift class would need a new branch | — | exists by design |
| 4 | Crash-and-retry after `changelog-release.mjs` ran twice (or manual edit) leaves duplicate `## [X]` sections in working tree; coa-merge composes a third section on top | C5 TPL-286: `detectChangelogDuplicates()` called at step 0; refuses with recovery hint before any ceremony begins | — | exists (unit: `detectChangelogDuplicates` export) |

### Test coverage gaps

- **CG-M2-1** — Property test: for every (VERSION-state, CHANGELOG-state) combination, J2 either accepts (clean) or refuses (half-baked) — no silent-pass.

---

## M3 — coa-merge auto-extend ceremony+regen claims (J5)

**Statement.** Between coa-merge steps 2 and 3, the caller's active
claim is extended with VERSION/CHANGELOG.md/package.json + Phase-5
regen paths so Phase 3 enforcement does not blow up on shared-infra
paths the ceremony will stage later.

**Why.** Pre-J5, coa-merge would file a claim covering only the
slice's code files, then stage VERSION/CHANGELOG/package.json
which are protectedPaths — Phase 3 enforce flagged the uncovered
shared-infra. J5 closes the loop by auto-extending.

**Category:** A — Enforced.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Caller has no active claim; J5 has nothing to extend | coa-merge surfaces "no active claim" — operator must `--acquire` first | — | exists |
| 2 | Caller has multiple active claims; J5 picks the wrong one | TPL-311: tiered scoring (agent identity > slice match > target overlap > recency tiebreak) in `pickCallerClaim`; ties on every signal refuse with `reason: 'ambiguous'`; `--claim-id=<id>` is the operator override. ADR-0039. | — | exists (`coa-merge-find-caller-claim.test.mjs`, 13 cases) |
| 3 | J5 extends to a path the operator never intended | extension targets are a fixed list (VERSION, package.json, CHANGELOG.md, Phase-5 regen paths) — not user-controlled | — | exists |
| 4 | Modify J5 target list silently | scripts in protectedPaths; meta-test asserts the auto-extend target list size and contents | add meta-test if not present | partial — see CG-M3-2 |
| 5 | Operator pre-stages CHANGELOG.md before running coa-merge; J5 filtered it as "already staged" → claim doesn't cover it → Phase-3 blocks | TPL-252: ceremony files (VERSION, CHANGELOG.md, package.json) are never filtered from the extend list — always added unconditionally | — | exists (unit: `coa-merge-j5-auto-extend.test.mjs`; integration: `coa-merge-j5-auto-extend.test.mjs`) |
| 6 | Staged source file X claimed but sidecar X.header.md not claimed; Phase-3 can block if sidecar is staged | TPL-252: J5 dynamically pairs staged sources with their sidecars — if `X.header.md` exists, it is added to the extend list regardless of whether it was pre-staged | — | exists (unit: `coa-merge-j5-auto-extend.test.mjs`; integration: `coa-merge-j5-auto-extend.test.mjs`) |

### Test coverage gaps

- **CG-M3-2** — Frozen-table meta-test for J5 auto-extend target paths. *(CG-M3-1 closed by TPL-311 via tiered scoring in `pickCallerClaim`; CG-M3-3 and CG-M3-4, the CHANGELOG+sidecar gaps, were closed by TPL-252.)*

---

## M4 — Auto-complete verification (J3 — HEAD + agent + extended-target)

**Statement.** `claim-check --auto-complete --staged` marks a claim "completed" when ALL of:

1. HEAD has moved (commit landed), OR `--from-pre-commit-hook` trusted context short-circuits this check.
2. Caller identifies authoritatively as one of:
   - `--from-pre-commit-hook` (trusted-context flag, preferred for hook integration; the hook environment is the trust signal).
   - `--agent=<name>` matching `claim.agent` (self-identification for non-hook callers, e.g. coa-merge step 9 post-commit).
3. Source set ∩ claim non-extended targets is non-empty (staged files or commit tree, depending on which mode is active).

**Commit-author identity is NOT a gate.** Operators run git with
`user.name=Igor Titov` (or any OS-level config) regardless of which
agent role owns the claim. Using commit author as an identity signal
caused a recurring "active claim never auto-completed" bug (TPL-254):
coa-merge step 9 called `--auto-complete --staged` with no `--agent=`
post-commit; the staging area was empty; callerAgent could not be
resolved; claim stayed active. Fixed in TPL-254 by passing
`--agent=${callerClaim.agent}` + `--commit-hash=<HEAD>` explicitly.

**Trust hierarchy:**

1. `--from-pre-commit-hook` — strongest; bypasses HEAD check.
2. `--agent=<name>` matching `claim.agent` — self-identification.
3. Commit-author match — NOT used (incorrect signal, closed by TPL-254).

**Why.** Pre-TPL-223, any `--auto-complete --staged` invocation
could mark a claim completed even if the commit hadn't actually
happened — racing agents could cause premature unlock. J3 closes
the gap. TPL-254 additionally closes the author-mismatch path that
prevented coa-merge's step 9 from ever completing claims.

**Category:** A — Enforced.
**Defined in:** `scripts/checks/claim-check.mjs` (verifyAgentAuthorization,
verifyClaimWorkCommitted), `scripts/coa-merge.mjs` (step 9).
**Test surface:** `tests/unit/claim-check-auto-complete.test.mjs`,
`tests/unit/claim-check.test.mjs` (verifyAgentAuthorization +
verifyClaimWorkCommitted sections).

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Call `--auto-complete --staged` with no --agent= and no --from-pre-commit-hook | rejects (Layer A gate; callerAgent unresolvable) | — | exists |
| 2 | Agent identity forged (set `COA_AGENT=foo`) | verified against `claim.agent`; mismatch is silent skip (cross-agent-no-really) | — | exists |
| 3 | Stage some file then auto-complete a different unrelated claim | extended-target check requires staged set ∩ claim.targets non-empty | — | exists |
| 4 | HEAD hasn't actually moved (pre-commit context) | --from-pre-commit-hook is the load-bearing signal; without it, HEAD-verification gate fires | — | exists |
| 5 | Pre-commit phase fails after auto-complete (Phase 3 success then Phase 6 fail) | TPL-206 — auto-complete moved from Phase 3 to AFTER all phases pass; failed Phase 4-7 leaves claim active | — | exists |
| 6 | coa-merge step 9 skips auto-complete (empty staging post-commit, no agent) | TPL-254 — step 9 now passes --agent=callerClaim.agent + --commit-hash=HEAD | — | exists |

### Test coverage gaps

- **CG-M4-1** — Verify auto-complete behavior under pre-commit failure: stage files, run `git commit` with a phase that fails, assert claim remains `active` (not `completed`).

---

## F1 — Force-expire authorization (5-layer)

**Statement.** `claim-check --force-expire` requires:
1. **Self-identification** — caller passes `--agent=<name>`.
2. **Same-agent default** — agent must match `claim.agent`.
3. **Cross-agent escape** — requires both `--really` and a non-empty
   `--reason`.
4. **Young-claim guard** — claims younger than
   `MIN_FORCE_EXPIRE_AGE_MINUTES` (5) require `--really` even from
   the same agent.
5. **Audit log** — every event lands in `.claims/audit.log` with full
   reason + signals.

**Why.** TPL-221 — Field-finding-008 incident: a 1-2 minute old live
claim was wiped by a sibling session in seconds with no audit trail.
The 5-layer gate makes force-expire a deliberate, traceable action.

**Category:** A — Enforced.
**Defined in:** `scripts/checks/claim-check.mjs`,
`docs/adr/0008-inter-agent-coordination-protocol.md`.
**Test surface:** `tests/unit/claim-check-force-expire-authorization.test.mjs`.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Force-expire without `--agent` | rejected with explicit error | — | exists |
| 2 | Force-expire another agent's claim with same-agent flow | `--really` + `--reason` required → cross-agent escape path | — | exists |
| 3 | Force-expire same-agent young claim | `--really` required (young-claim guard) | — | exists |
| 4 | Force-expire without writing audit log | append happens BEFORE the actual expiry mutation; failure to append aborts | — | exists |
| 5 | Modify `MIN_FORCE_EXPIRE_AGE_MINUTES` to weaken guard | constant exposed by name; meta-test pins value | add meta-test if not present | partial — see CG-F1-1 |
| 6 | Pass empty `--reason` to bypass cross-agent gate | non-empty check rejects | — | exists |
| 7 | Forge agent identity via env var | `--agent` is explicit flag; env var is a fallback with same trust | document trust boundary explicitly | discipline |
| 8 | Run force-expire from a script that auto-passes `--really` for every call | code review of any script doing this is the defense; scripts in repo are subject to claim-check protectedPaths | — | discipline |

### Test coverage gaps

- **CG-F1-1** — Meta-test pinning `MIN_FORCE_EXPIRE_AGE_MINUTES === 5`.

---

## F2 — Force-expire abandoned-check (3-signal heuristic)

**Statement.** Cross-agent `--force-expire` (`--really` + `--reason`)
also runs `checkClaimAbandoned()`, which combines three signals:
- **Age signal** — older claims are more likely abandoned.
- **Git-activity signal** — has the claim's agent's branch been
  active recently?
- **Stash signal** — does the agent have a stash older than the
  claim's TTL?

The function returns confidence `high` / `medium` / `low`. `high`
permits cross-agent override; `medium`/`low` require BOTH
`COA_OPERATOR=1` AND `--operator-confirmed`.

**Why.** TPL-225 — even with F1's 5-layer gate, cross-agent expiry
of an in-flight claim can race a session that's actually working.
The abandoned-check adds a heuristic data layer so the audit log
records "we saw signals X, Y, Z and judged confidence Q".

**Category:** A — Enforced.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Override a recent-and-active claim (agent has fresh commits) | git-activity signal pushes confidence to `low`; requires operator gate | — | exists |
| 2 | Override a stash-protected claim | stash signal counts; weighted into confidence | — | exists |
| 3 | Pass `COA_OPERATOR=1` from inside an agent run | harness does not propagate; same model as TPL-225 | — | exists |
| 4 | Modify `checkClaimAbandoned` to always return `high` | function is unit-tested across signal combinations; weakening fails meta-tests | add meta-test pinning the high/medium/low thresholds | partial — see CG-F2-1 |
| 5 | Set system clock to falsify age signal | OS-level mitigation only | — | discipline |
| 6 | Stash-signal evasion: clear all stashes before override | stash-signal becomes neutral, but git-activity remains; both signals contribute | — | exists |
| 7 | Refresh the agent's branch with a noop commit to trigger git-activity guard | adversarial pattern; documented as a vector but fundamentally heuristic | accept and audit | discipline + audit-log |

### Test coverage gaps

- **CG-F2-1** — Meta-test pinning the `confidence` thresholds for the (age, git-activity, stash) tuple.
- **CG-F2-2** — Test the audit-log shape after a `force-expire-rejected` event (cross-agent abandoned-check refusal).

---

## H1 — Header sidecar discipline (slim inline + sparse sidecar)

**Statement.** Every meaningful tracked file carries a 7-field slim
inline header (`@version`, `@purpose`, `@sidecar`, `@layer`,
`@hex`/`@ctx`, `@public`, `@edit`) plus a sparse `.header.md` sidecar
holding all extended metadata. Comment-unsafe formats (JSON, SVG,
binary) use sidecar-only with no inline header.

**Why.** ADR-0009 — heavy inline headers consumed token budget and
rotted fast; sparse sidecars keep meaningful state without polluting
inline. The slim inline header is the operator's "what is this file"
on a Read; the sidecar is the LLM's structured state.

**Category:** A — Enforced.
**Owner scripts:** `header-check.mjs`, `header-fix.mjs`,
`header-create.mjs`, `header-migrate.mjs`.
**Pre-commit phase:** 5 (`header-fix --since=HEAD --use-current-version`) — stamps `@version`
preemptively with current VERSION and git-adds stamped files (TPL-246).
**Post-commit:** fully disabled (TPL-246).

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Add a meaningful file with no header | header-check fails CI; pre-commit Phase 5 `header-fix` adds for new files | — | exists |
| 2 | Strip an existing header to "simplify" | header-check fails CI on any file matching `meaningful-files` predicate without header | — | exists |
| 3 | Manually write `@version 99.99.99` in a header | pre-commit Phase 5 `--use-current-version` OVERWRITES `@version` on files in the changed set; unchanged files keep the operator's edit | — | partial — see CG-H1-1 |
| 4 | Sidecar drifts from inline (different `@purpose`) | sidecar-content-check enforces inline-vs-sidecar invariants for `@purpose`, `@layer`, `@public`, `@edit` | — | exists (`sidecar-content-check.mjs`) |
| 5 | Add a 7-field-shaped header to a file the linter doesn't expect to have one | header-check's "meaningful-files" predicate is conservative — adding a header to non-meaningful is a no-op | — | exists |
| 6 | Modify `header-fix.mjs` to weaken the slim-header regex | scripts/checks/* not all in protectedPaths; rely on architecture-check + module-fit to detect oversized fix; consider adding header-fix to protectedPaths | add header-fix to protectedPaths | gap — see CG-H1-2 |
| 7 | Replace the sidecar with a stub `.header.md` containing only `# filename` | sidecar-content-check enforces that the sidecar contains the structured YAML frontmatter when the inline header references it; the body itself is decorative | — | exists |
| 8 | `@edit: rewrite-ok` on a careful-edit file to bypass review | `@edit` is a directive to humans/LLMs; not a code-enforced gate | code review is the defense | discipline |
| 9 | Modify slim-header source X; stage both X and X.header.md; claim covers only X; Phase-3 enforcement sees uncovered staged sidecar → may block | TPL-252: J5 auto-extend (M3) dynamically pairs each staged source with its sidecar if the sidecar file exists — the claim covers both X and X.header.md before Phase-3 runs; `sidecar-content-check` (existing) separately enforces inline+sidecar consistency | — | exists (M3 vectors 6 tests in `coa-merge-j5-auto-extend.test.mjs`) |

### Test coverage gaps

- **CG-H1-1** — Test that `header-fix` does NOT overwrite `@version` on files unchanged in HEAD's diff (lazy-stamp invariant).
- **CG-H1-2** — Add `scripts/checks/header-fix.mjs` and `header-check.mjs` to `protectedPaths` (silent weakening of the regex is high-impact).

---

## H2 — Per-file `@version` last-content-change semantics

**Statement.** A file's `@version` updates only when the commit that
lands actually modifies the file's content (excluding header-only
restamps). Pre-commit Phase 5 uses `--use-current-version` to stamp
`@version` preemptively with the ceremony VERSION on changed files,
then git-adds the results — ensuring the stamp lands in the commit
blob with zero post-commit residue (TPL-246).

**Why.** ADR-0014 / TPL-233 / TPL-246. Pre-ADR-0014, every commit
re-stamped ~1968 files to the new VERSION. TPL-233 narrowed this to
post-commit stamping of changed files but left persistent working-tree
residue. TPL-246 eliminates the residue by moving the stamp into
pre-commit Phase 5 and disabling post-commit entirely.

**Category:** A — Enforced.
**Defined in:** `docs/adr/0014-per-file-version-semantics.md`
(including the TPL-246 Revision section),
`.claude/rules/development.md` (Phase 5 preemptive stamp).
**Owner scripts:** `scripts/checks/header-fix.mjs --use-current-version`
(via pre-commit Phase 5). `.githooks/post-commit` is fully disabled.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Run `header-fix --all` directly | `--all` is reserved for explicit global refactors (ADR change); pre-commit uses `--since=HEAD` only | document trust boundary | discipline |
| 2 | Manually write `@version` in a header before commit | pre-commit `--use-current-version` OVERWRITES on content-changed files | — | exists |
| 3 | Expand post-commit hook | post-commit is fully disabled; any expansion requires a new ADR; CLAUDE.md is explicit | — | exists (process-level) |
| 4 | Strip `@version` from a slim header to evade stamping | header-check fails CI on missing required field | — | exists |
| 5 | Edit `.githooks/post-commit` to re-enable automation | `.githooks/*` is in `protectedPaths`; CLAUDE.md is explicit | — | exists |

### Test coverage

- **CG-H2-1 — closed (TPL-246)** — `tests/integration/per-file-version-semantics.test.mjs`: last-content-change invariant (A stamped, B unmodified) + working-tree convergence (`git status --porcelain` empty after commit).

---

## B1 — Module work-surface budget (≤8K warn / 12K error)

**Statement.** Each hex module's work-surface (manifest +
public-api + sidecars + 1 representative impl + 1 representative
test) must fit within 8,000 tokens (warn) and 12,000 tokens
(error). Anchored to the 16K local-LLM context floor with headroom
for harness + conversation.

**Why.** ADR-0013 — Contextrail commits to mixed-tier agent teams
including local 7B-class models with 16K context. A module that
doesn't fit the work-surface budget cannot be edited by a local-tier
agent at all.

**Category:** A — Enforced (warn-only initially; error threshold
is a follow-up promotion).
**Owner:** `scripts/checks/module-fit-check.mjs`.
**Pre-commit phase:** 6 (warn-only via `--warn-only`).

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Module exceeds 12K but check is `--warn-only` | warn-only is intentional during cleanup phase; promotion to hard-error is queued | follow-up promotion when over-budget modules are cleaned | gap — see CG-B1-1 |
| 2 | Pick a non-representative test as "representative" to look smaller | `pickRepresentativeTest` picks the largest test in `tests/unit/<module>*` or `tests/contract/<module>*`; deterministic | — | exists |
| 3 | Move large impl out of `domain/` into `adapters/` (which has 400-LOC budget) | architecture-check's tiered limits + module-fit measure are independent; doesn't bypass token count | — | exists |
| 4 | Modify `approximateTokenCount` to under-count | function exported and unit-tested with known byte→token cases | — | exists |
| 5 | Add a new module above 12K | warn fires; promotion to hard-error required to enforce | — | gap — same as #1 |

### Test coverage gaps

- **CG-B1-1** — Promote `module-fit-check` from `--warn-only` to hard-error once all current modules are under-budget. Track in inter-agent-coordination backlog.

---

## T1 — Spec / USM traceability (pre-impl gate)

**Statement.** User-facing behavior changes require persona/workflow
USM coverage and PRD coverage before implementation. The pre-impl
gate refuses if the linked work item lacks required artifacts.

**Why.** Process-doc rule encoded in CLAUDE.md "Hard stop before
implementation". Without spec coverage, slices drift from intent
and acceptance becomes ad-hoc.

**Category:** A — Enforced (script + pre-commit phase 4).
**Owner:** `scripts/checks/pre-impl-gate.mjs`,
`scripts/checks/usm-check.mjs`, `scripts/checks/spec-check.mjs`.
**Pre-commit phase:** 4.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Skip USM by claiming "internal refactor" | decision tree in CLAUDE.md: bugfix/refactor with no user-visible change → skip; the claim is verifiable by reviewing the diff | — | discipline + review |
| 2 | File a one-line PRD as token gesture | spec-check enforces structural completeness, not depth | depth review is human | discipline |
| 3 | Skip `pre-impl-gate.mjs` via `COA_SKIP_GATES=4` | Phase 4 is NOT in `NON_SKIPPABLE_PHASES` — bypassable for non-user-facing slices | promote Phase 4 to non-skippable for slices touching `apps/*` | gap — see CG-T1-1 |
| 4 | Reference a non-existent slice ID in commit | commit-msg-check requires `[A-Z]+-\d{3,}` shape; doesn't verify existence | spec-sync verifies trace links resolve | exists |
| 5 | Reference an existing-but-stale slice ID | spec-check flags broken trace links; spec-sync auto-repairs where possible | — | exists |

### Test coverage gaps

- **CG-T1-1** — Conditional non-skippable: if any staged path matches `apps/**` or `modules/**/adapters/**` (user-visible), Phase 4 becomes non-skippable.

---

## T2 — Changelog / VERSION discipline

**Statement.** Every atomic commit bumps VERSION and adds a
CHANGELOG section. VERSION must equal the latest versioned CHANGELOG
section. `[Unreleased]` must contain `_Nothing yet._` after a
release-discipline-check pass. No empty version sections.

**Why.** Release discipline. Drift between VERSION and CHANGELOG
means a bump happened without content (or content without bump),
both of which break the per-commit accountability contract.

**Category:** A — Enforced.
**Owner:** `scripts/checks/release-discipline-check.mjs`,
`scripts/checks/changelog-sync.mjs --check`.
**Pre-commit phase:** 7.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Skip VERSION bump on a behavior-change commit | release-discipline-check flag A: VERSION not bumped → exit 1 | — | exists |
| 2 | Bump VERSION but leave CHANGELOG empty | check D: matching versioned section required | — | exists |
| 3 | Jump VERSION (0.7.40 → 0.8.0 without minor work) | check E: +1 patch only (or explicit minor/major bump justified) | — | exists |
| 4 | Set `COA_SKIP_VERSION_CHECK=1` env to bypass | env override exists but is documented "emergency only"; not in non-skippable phases today | promote to non-skippable; remove the bypass env | gap — see CG-T2-1 |
| 5 | Write `## [0.7.41]` heading in CHANGELOG without content | empty section is a defect per CLAUDE.md; release-discipline-check flag check could catch | extend check to assert non-empty content under each versioned heading | partial — see CG-T2-2 |
| 6 | Run `release-discipline-check` from a script with `cwd: ROOT` set to a different repo | TPL-200 — ROOT is `process.cwd()`, not script-relative; flake-prone if invoked wrong | document the invocation contract | discipline |

### Test coverage gaps

- **CG-T2-1** — Promote release-discipline-check to non-skippable (remove `COA_SKIP_VERSION_CHECK` bypass).
- **CG-T2-2** — Add check that every versioned CHANGELOG section has at least one non-whitespace line of content.

---

## T3 — Commit message format (Conventional + work-item ID + ≤100 chars)

**Statement.** Commit messages match `<type>(<scope>)?: <summary>`
shape. `type` is one of feat/fix/docs/test/refactor/chore/perf/build/ci/style.
Header ≤ 100 chars, no trailing period. Body wrapped ≤ 72 chars.
Message must reference at least one work-item ID
(`[A-Z][A-Z0-9]+-\d{3,}`).

**Why.** Conventional Commits enables automated CHANGELOG generation
and per-commit traceability to backlog/spec. The 100-char limit
forces short subjects so reviewers can scan logs.

**Category:** A — Enforced.
**Owner:** `scripts/checks/commit-msg-check.mjs`.
**Hook:** `.githooks/commit-msg`.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Subject line > 100 chars | exit 1 with explicit `header is N chars` error | — | exists |
| 2 | No work-item ID anywhere | regex must match somewhere in message; reject | — | exists |
| 3 | `Merge`/`Revert` auto-generated commits | SKIP_PREFIXES bypass | — | exists |
| 4 | Use `--no-verify` on commit | R8 (planned) closes this from a different angle | — | gap (same as R2 #5) |
| 5 | Modify `ALLOWED_TYPES` list | unit test pins the list | — | exists |
| 6 | Pad work-item ID with whitespace (`TPL-240   `) | regex matches `[A-Z][A-Z0-9]+-\d{3,}` anywhere; whitespace doesn't break it | — | exists |

### Test coverage gaps

- **CG-T3-1** — Meta-test that asserts `ALLOWED_TYPES` is exactly the documented set (no silent additions).

---

## A1 — BBA workflow (seam-first, disabled-by-default)

**Statement.** New behavior is introduced behind a stable seam,
disabled by default, until proof is green. The seam is added FIRST;
new code path is added BEHIND the seam, with the old path active;
proof of new path is green BEFORE switching the seam; old path is
removed in a later atomic commit when that keeps the change set clearer.

**Why.** ADR-0002. Trunk-Based Development requires that incomplete
work reach trunk safely. Long-lived feature branches are forbidden
(R2 enforces this structurally now); BBA is the in-trunk discipline
that replaces them.

**Category:** B — Aspirational. Documented; partial enforcement only.
**Owner skill:** `trunk-bba` (`.claude/skills/trunk-bba/SKILL.md`,
`.agents/skills/trunk-bba/SKILL.md`).

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Replace old path in one big rewrite, no seam | code review + delivery-flow-check flags large changesets touching multiple modules; not BBA-aware | add seam-detection lint that flags new-feature commits without a seam in the diff | gap — see CG-A1-1 |
| 2 | Add a seam, never remove old path (forgotten BBA cleanup) | seam-rollback-check exists; seam-audit reports on outstanding seams | active "abandoned seam" detection | partial — see CG-A1-2 |
| 3 | Add a seam but enable new path immediately (skip "disabled-by-default") | feature-flag registry pattern not enforced; seams may or may not have flags | feature-flag registry with default-off invariant | gap — see CG-A1-3 |
| 4 | Use a seam for cosmetic-only abstraction (no behavior switch) | acceptable; not a BBA violation | — | discipline |

### Test coverage gaps

- **CG-A1-1** — `seam-detection-lint`: when a commit adds new-feature code paths without a seam, warn.
- **CG-A1-2** — `abandoned-seam-detector`: seams older than N days with no recorded cleanup trigger appear in `seam-audit` output as flagged.
- **CG-A1-3** — Feature-flag registry: every seam should reference a flag, default-off, with cleanup trigger noted.

---

## A2 — Hexagonal boundaries (no deep imports)

**Statement.** Cross-module imports are allowed only through
`public-api.{ts,mjs}`. Domain and ports must stay framework-free.
Adapters may use any UI framework. Apps may use any framework. No
file imports a sibling module's internals.

**Why.** ADR-0006. Modular monolith with explicit boundaries makes
module detachment cheap and prevents accidental coupling.

**Category:** B — Aspirational (architecture-check covers a subset
of patterns).
**Owner:** `scripts/checks/architecture-check.mjs`.
**Pre-commit phase:** 6.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Import sibling module's internal file directly | architecture-check flags relative imports crossing module boundary | — | exists |
| 2 | Import via `node_modules/` symlink trick | absolute imports through registered package names — not detected today (and probably correct since published modules are public-API by design) | — | exists by design |
| 3 | Re-export via own public-api a sibling's internal | architecture-check flags the underlying import | — | exists |
| 4 | Use `eval()` or dynamic `await import('../sibling/internal')` | regex-based architecture-check doesn't follow dynamic imports | extend check to flag template-literal `import()` patterns crossing module boundary | gap — see CG-A2-1 |
| 5 | Domain layer imports a framework directly | architecture-check tier rules: domain/ has 180-LOC limit; framework imports flagged | — | exists |

### Test coverage gaps

- **CG-A2-1** — Extend architecture-check to flag dynamic `import()` and `require()` patterns crossing module boundaries.
- **CG-A2-2** — Test that publishes a module under `modules/foo/` and asserts every consumer goes through `public-api`.

---

## A3 — TDD default (failing test first; regression-first bugfixes)

**Statement.** New behavior requires tests first. Bugfixes start
with a failing regression test that reproduces the bug. Both must
exist before implementation lands.

**Why.** Without tests-first, bugfixes are shaped by what's
convenient rather than by the failure mode itself; regressions slip
in.

**Category:** B — Aspirational. Cannot be code-enforced because
"is this test new?" is a property of intent, not the diff.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Write impl without test (no regression test for bugfix) | code review; test-gate ensures existing tests pass but doesn't verify a NEW test was added | optional: assert that every "fix:" commit includes ≥1 modified test file | partial — see CG-A3-1 |
| 2 | Add a test that always passes (cosmetic) | code review | mutation testing (heavy; aspirational) | discipline |
| 3 | Disable a flaky test instead of fixing | grep for `.skip` / `.only` additions in pre-commit | add a check | gap — see CG-A3-2 |

### Test coverage gaps

- **CG-A3-1** — Heuristic check: `fix:` commits must include at least one staged test file (warn-only).
- **CG-A3-2** — Lint that flags `.skip` / `.only` additions in `tests/**`; require explicit operator override.

---

## A4 — README in every meaningful folder

**Statement.** Every tracked folder under `.claude/`, `.githooks/`,
`scripts/`, `docs/`, `tests/`, `modules/`, `apps/`, `packages/` that
contains files must have a `README.md`.

**Why.** Folder intent should be explicit for both humans and LLMs
navigating untouched areas. README is the navigational contract.

**Category:** B — Aspirational (check exists; passes trivially today
on most folders).
**Owner:** `scripts/checks/readme-check.mjs`,
`scripts/checks/readme-fix.mjs`.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Create new folder with files but no README | readme-check flags missing README at next pre-commit | — | exists |
| 2 | Replace README with single-line stub `# foo` | check doesn't enforce content depth | content-quality lint (heuristic; aspirational) | gap — see CG-A4-1 |
| 3 | README links to non-existent files | not validated today | link-rot check | gap — see CG-A4-2 |

### Test coverage gaps

- **CG-A4-1** — Heuristic README quality check: at least N words; references at least one tracked file in the folder.
- **CG-A4-2** — README internal-link validator (links to other docs/files in the repo resolve).

---

## A5 — Atomic commits (one slice = one commit)

**Statement.** One slice equals one commit. Do not batch multiple
completed slices before commit-ready finalization. A multi-module
atomic commit is acceptable only when splitting would leave a broken
intermediate state, ≤3 modules, all listed in the commit scope.

**Why.** Atomicity makes review, revert, and bisect tractable.
Batched slices hide cross-cutting decisions in single diffs.

**Category:** B — Aspirational. `changeset-size-check.mjs` warns
on large diffs but cannot judge "is this one slice or three".

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Stage two unrelated slices in one commit | changeset-size-check warns above thresholds; reviewer judgment | scope-coherence heuristic (paths cluster around one work-item ID) | gap — see CG-A5-1 |
| 2 | "While I'm here" cleanup edits in a feature commit | code review only | — | discipline |
| 3 | Multi-module commit (3+ modules) without justification | discipline-only; checklist in CLAUDE.md | post-hoc audit | discipline |

### Test coverage gaps

- **CG-A5-1** — Heuristic: changesets touching N+ unrelated paths should require multi-slice justification in the commit body.

---

## A6 — i18n / messages layer for all user copy

**Statement.** All user-facing UI copy goes through a simple
i18n/messages layer from day one, even if the app initially ships
with only one locale.

**Why.** Late-stage i18n migration is expensive. Day-one discipline
costs almost nothing and unblocks future localization.

**Category:** B — Aspirational. Cannot be fully code-enforced
because "is this string user-facing?" is a property of intent.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Hardcode an English string in JSX | code review + frontend-delivery skill checklist | lint rule that flags string literals in JSX/template that aren't trivial (whitespace, single chars) | gap — see CG-A6-1 |
| 2 | Add a messages key but don't translate | one-locale repos pass trivially; no defense needed today | — | exists by design |
| 3 | Use template-literal interpolation that breaks message extraction | message-extraction tools (ICU MessageFormat) catch this; not yet wired | — | gap |

### Test coverage gaps

- **CG-A6-1** — Lint rule for hardcoded strings in `apps/**/*.{jsx,tsx,vue}` and `modules/**/adapters/**/*.{jsx,tsx,vue}`. Warn-only initially.

---

## A7 — UI selectors from bounded registry

**Statement.** Stable `data-testid`, reusable DOM `id`, and derived
selectors come from a bounded registry (e.g.,
`apps/starter/ui-selectors.mjs`) rather than being hardcoded
independently in templates, JS, and tests.

**Why.** Without a registry, a selector rename requires updating
N callsites; with a registry, it's one edit.

**Category:** B — Aspirational. Documented in CLAUDE.md +
architecture.md + frontend-delivery skill.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Hardcode `data-testid="submit-btn"` directly in JSX | code review only | lint rule that flags `data-testid="..."` literals (require import from registry) | gap — see CG-A7-1 |
| 2 | Use stringly-typed selector in a Playwright test | bdd-playwright skill checklist; not enforced | extend playwright config to require selectors from registry | gap |
| 3 | Registry has no entry for a selector but it's already in code | selector inventory: every literal in templates should have a registry counterpart | inventory test | gap — see CG-A7-2 |

### Test coverage gaps

- **CG-A7-1** — Lint: every `data-testid="..."` literal in `apps/**` and module adapters must come from a registry import.
- **CG-A7-2** — Inventory check that the registry contains every active selector.

---

## D1 — Aggregator dispatch templates (canonical structure, summary file)

**Statement.** Every dispatch prompt for a parallel session must
include: explicit slice ID + worktree creation command + ceremony
checklist + acceptance criteria + a required summary-file deliverable
written to `docs/analysis/session-summaries/<YYYY-MM-DD>_<TPL-ID>_<title>_Summary.md`.
The aggregator session keeps its own summary file at the same path.

**Why.** Field finding (memory `feedback_summary_files.md`): every
dispatch prompt requires the receiving session to write a summary file
to disk so the aggregator can find findings on disk; aggregator keeps
own summary file with same convention.

**Category:** C — Discipline.
**Defined in:** `.claude/CLAUDE.md` (operating contract via memory),
`docs/guides/parallel-sessions.md`,
`docs/templates/dispatch-prompt.md` (parallel-session template),
`docs/templates/backport-prompt.md` (cross-repo backport template).

**Next step toward Category B:** CG-D1-1 — optional
`scripts/checks/dispatch-template-lint.mjs` that asserts draft dispatch
prompts contain all required structural sections.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Dispatch a session with no summary-file requirement | discipline-only; the aggregator's own dispatch process is the gate | template lint that asserts dispatch prompts contain the summary-file phrase | gap — see CG-D1-1 |
| 2 | Receive a session that doesn't write the summary file | the aggregator can't find findings; manual chase | post-merge check for the summary file matching the slice ID | gap — see CG-D1-2 |
| 3 | Use the wrong path/format for the summary | discipline-only | — | discipline |

### Test coverage gaps

- **CG-D1-1** — Optional template-lint script `scripts/checks/dispatch-template-lint.mjs` that operator can run on draft prompts.
- **CG-D1-2** — Post-merge check: every TPL-NNN that lands also has a `docs/analysis/session-summaries/*TPL-NNN*` file.

---

## D2 — No `git add -u` / `git add .`

**Statement.** Always name specific files. Never use `git add -u`,
`git add .`, or `git add :/`.

**Why.** Parallel-session safety. Bulk add captures WIP from other
sessions sharing the worktree.

**Category:** C — Discipline.
**Defined in:** `.claude/rules/development.md`, CLAUDE.md.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Run `git add -u` and stage parallel-session WIP | discipline-only; pre-commit hook re-stages only originally-staged files but doesn't undo the add | shell wrapper / git alias that warns on `add -u`/`add .` | gap — see CG-D2-1 |
| 2 | Run `git add .` from a sub-directory | same as above | — | gap |

### Test coverage gaps

- **CG-D2-1** — Optional `~/.gitconfig` hook or shell wrapper that prompts on `git add -u` / `git add .`. Not enforceable from this repo.

---

## D3 — Pull --rebase before VERSION / CHANGELOG bump

**Statement.** Always `git pull --rebase` before bumping VERSION,
CHANGELOG, or package.json. The window between "read VERSION" and
"commit" must be seconds.

**Why.** Without rebase, you collide with another session's bump
and either overwrite their VERSION or merge-conflict.

**Category:** C — Discipline (coa-merge automates this; manual
fallback requires the operator to do it).

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Bump VERSION based on stale read | release-discipline-check D — VERSION must be HEAD+1 patch; if stale, becomes HEAD+2 → reject | — | exists |
| 2 | Wide window between read and commit | discipline; coa-merge keeps the window short by design | — | exists (process) |
| 3 | Use `coa-merge` (which does this for you) | the canonical fix | — | exists |

### Test coverage gaps

- None — release-discipline-check D already catches stale-read collisions deterministically.

---

## D4 — Scope repo-wide fix scripts to active dir

**Statement.** Use `header-fix --scope=<dir>`, `readme-fix --scope=<dir>`,
`prettier --write <dir>`, `eslint --fix <dir>` instead of repo-wide
invocations. Repo-wide fixes regenerate files in other sessions' areas.

**Why.** Same as D2 — parallel-session safety. A repo-wide fix from
session A can stomp on session B's WIP.

**Category:** C — Discipline.

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Run `header-fix --all` outside an explicit global refactor | development.md says `--all` is for explicit global refactors only; pre-commit uses `--since=HEAD` | header-fix could refuse `--all` unless `COA_OPERATOR=1` | gap — see CG-D4-1 |
| 2 | Run repo-wide prettier / eslint | not directly under our control (third-party tools) | — | discipline |

### Test coverage gaps

- **CG-D4-1** — Optional: `header-fix --all` refuses without `COA_OPERATOR=1` (or a `--really-all` flag).

---

## R8 — Hook integrity / bypass closer

**Statement.** Pre-commit hooks can be bypassed via `--no-verify`,
`COA_SKIP_GATES`, modified hooks, or remote force-push. R8 closes each
bypass path with a complementary, post-hoc defense layer that is
independent of the pre-commit hook itself.

**Why.** Every check built so far (R1 test isolation, R2 transport branch,
R6 merge ceremony, T2/T3 release+commit-msg, etc.) is single-line
bypassable with `git commit --no-verify`. Without R8, each rule has a
known escape that is detectable only after the fact by a human reviewer.
R8 makes bypasses observable, traceable, or impossible through layered
complementary defenses.

**Sub-checks (incremental rollout):**
- **R8.1 Snapshot coverage** (TPL-247) — pre-push hook detects CHANGELOG
  version without matching `.backups/` snapshot (catches `--no-verify`
  skipping coa-merge step 9b). Backported from Cockpit AIC-087.
  Warn-only initially; promotion to hard-error tracked in CG-R8-1.
- **R8.2 Hook integrity** (TPL-256, **landed**) — sha256 fingerprints of
  all `.githooks/*` files stored in `.githooks/.fingerprints.json`.
  Pre-commit Phase 1.0 (non-skippable) verifies fingerprints before
  running. Pre-push also verifies as a catch-net when pre-commit itself
  was the tampered hook. Operator-gated `--update` (COA_OPERATOR=1)
  regenerates registry when hooks legitimately change.
- **R8.3 CI assertion** (CG-R8-3, follow-up) — CI workflow runs all
  pre-commit phases server-side; no local bypass survives.
- **R8.4 Bypass audit** (TPL-258, **landed**) — pre-commit appends a
  phases-ran record to `.claims/coa-phases-ran.tmp`; post-commit attaches
  the commit SHA and appends to `.claims/commit-audit.log`. Pre-push runs
  `bypass-audit-check.mjs` which flags any recent commit with no matching
  record (hard fail, symmetric with R8.2).
- **R8.5 Trunk integrity** (TPL-259, **landed**) — pre-push hook detects
  force-push to trunk via ancestry check (`git merge-base --is-ancestor`).
  Refuses unless `COA_OPERATOR=1 COA_FORCE_TRUNK=1` (audited to
  `.claims/audit.log`). Runs as the FIRST check in pre-push (fail-fast,
  before R8.2/R8.4/R8.1). Documents remote branch protection as the
  required second-layer defense (server-side, not enforceable from repo).

**Category:** A — Enforced (R8.1 + R8.2 + R8.4 + R8.5 enforced; R8.3 follow-up).
R8.2 is non-skippable from day 1 — security-critical: a hook that can
skip its own integrity check provides no protection.
R8.4 is hard-fail at pre-push — symmetric with R8.2; a bypass that is
only observable after pushing provides no deterrent.

**Defined in:** This registry entry (TPL-247, TPL-256, TPL-258, TPL-259). ADR-0018
planned for expanded R8 design when R8.3 lands.

**Owner script(s):** `scripts/checks/snapshot-coverage-check.mjs` (R8.1),
`scripts/checks/hook-integrity-check.mjs` (R8.2),
`scripts/lib/hook-integrity.mjs` (R8.2 pure lib),
`scripts/checks/bypass-audit-check.mjs` (R8.4),
`scripts/lib/bypass-audit.mjs` (R8.4 pure lib),
`scripts/checks/trunk-integrity-check.mjs` (R8.5),
`scripts/lib/trunk-integrity.mjs` (R8.5 pure lib).

**Registry:** `.githooks/.fingerprints.json` — sha256+size for every
`.githooks/*` file. In `protectedPaths` — silent update requires a claim.

**Audit log:** `.claims/commit-audit.log` — operator-local NDJSON ledger,
gitignored. Each record: `{ts, phases[], skipped[], skipReason, commitSha}`.

**Pre-commit phase:** Phase 1.0 (non-skippable) in `.githooks/pre-commit`.
In `NON_SKIPPABLE_PHASES` alongside 2.5 and 2.7.
R8.4 phase tracking appended at end of pre-commit (after all phases pass).

**Post-commit hook:** `.githooks/post-commit` — attaches commit SHA to the
temp record and appends to `.claims/commit-audit.log`. Read-only + append
per TPL-246/TPL-260 policy.

**Pre-push hook:** `.githooks/pre-push` runs R8.5 first (fail-fast force-push
gate), then R8.2, R8.4, R8.1 (in that order). Hook installed via
`core.hooksPath = .githooks`.

**Test surface:** `tests/unit/snapshot-coverage.test.mjs` (26 unit cases,
R8.1), `tests/integration/snapshot-coverage-gap.test.mjs` (4 cases, R8.1),
`tests/unit/hook-integrity.test.mjs` (14 unit cases, R8.2),
`tests/integration/hook-integrity-check.test.mjs` (7 integration cases,
R8.2), `tests/unit/bypass-audit.test.mjs` (23 unit cases, R8.4),
`tests/integration/bypass-audit-check.test.mjs` (7 integration cases, R8.4),
`tests/unit/trunk-integrity.test.mjs` (23 unit cases, R8.5),
`tests/integration/trunk-integrity-check.test.mjs` (6 integration cases, R8.5).

**Cross-references:** R2 (CG-R2-1 — `--no-verify` bypass; R8.1/R8.2/R8.4
now close multiple angles), R6 (Check 6 — audit-log correlation; R8.4 adds
the phase-level ledger), T2 (CHANGELOG discipline; snapshot is artifact proof).

### R8.1 Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | `git commit --no-verify` skips coa-merge step 9b (snapshot) | R8.1 pre-push hook detects CHANGELOG version without matching `.backups/` snapshot at next push | — | exists (integration test: bypass incident shape) |
| 2 | `git push --no-verify` skips the pre-push hook entirely | The operator bypassed both — snapshot gap persists silently. No local defense exists. | R8.3 CI assertion (planned, CG-R8-3) — server-side hooks can't be skipped | gap — see CG-R8-3 |
| 3 | `COA_SKIP_GATES` env override skips Phase N (e.g., snapshot production phase) | R8.4 bypass audit (**landed**, TPL-258) — records which phases ran; `COA_SKIP_GATES` of NON_SKIPPABLE phases is ignored; bypassed commits have missing metadata flagged at pre-push | — | exists (integration test: COA_SKIP_GATES with non-skippable phases present) |
| 4 | Operator modifies `.githooks/pre-push` to no-op the check | R8.2 (TPL-256, **landed**) — pre-commit Phase 1.0 detects tampered pre-push; pre-push self-checks before snapshot check | — | unit + integration (TPL-256) |
| 5 | `git push --force` to main from another machine (bypasses all local hooks) | R8.5 trunk integrity (**landed**, TPL-259) — pre-push refuses force-push to trunk; operator override audited; remote branch protection is documented as required second layer | — | exists (R8.5 integration tests: force-push refused, operator override audited) |
| 6 | Commit in CI without running pre-commit hooks (no hooks installed on CI runner) | R8.3 CI assertion (planned, CG-R8-3) | — | gap — see CG-R8-3 |
| 7 | Modify `snapshot-coverage-check.mjs` to always return `ok: true` | `snapshot-coverage-check.mjs` can be added to `protectedPaths`; unit meta-test pins the 5 pure-helper invariants; tampering breaks the helper unit suite | add script to `protectedPaths` (tiny follow-up) | exists (unit tests pin helper behavior) |
| 8 | Skip `pnpm mergezip` after manually editing CHANGELOG (adds version heading without snapshot) | R8.1 pre-push hook catches at next push — snapshot gap is detectable even without understanding how it formed | — | exists (integration test: --since scopes to newly-added version) |
| 9 | Produce snapshot in transport worktree (wrong cwd) — `.backups/` invisible from main | R6 Check 1 warns when snapshot is in wrong path; R8.1 catches the missing file from main's perspective | document "run pnpm mergezip from main worktree" as operator requirement | partial (R6 Check 1) |

### R8.2 Whitehack — evasion vectors (TPL-256)

| # | Vector | Defense | Test status |
|---|---|---|---|
| 1 | Modify `.githooks/pre-commit` to `exit 0` at top | pre-push Phase 1.0 hook-integrity-check catches mismatch at next push | unit + integration (TPL-256) |
| 2 | Add new hook (e.g. `.githooks/post-merge`) with destructive code | "extras" detection in `compareFingerprints` → Phase 1.0 fails commit | integration (TPL-256) |
| 3 | Modify `.githooks/.fingerprints.json` to match tampered hooks | file in `protectedPaths` → claim-check Phase 3 requires explicit claim | claim-check enforce |
| 4 | Modify `hook-integrity-check.mjs` itself to always exit 0 | `scripts/checks/hook-integrity-check.mjs` in `protectedPaths`; tampering requires claim; pre-push still runs integrity check | partial (protectedPaths) |
| 5 | `git commit --no-verify` bypass of Phase 1.0 | pre-push hook-integrity-check runs independently; tampered hook caught at push time | integration (TPL-256) |
| 6 | `git config core.hooksPath=/dev/null` to disable hooks entirely | R8.3 (CI assertion, planned) + R8.5 (trunk integrity) close; no local defense | gap (R8.3/R8.5 territory) |

### R8.4 Whitehack — evasion vectors (TPL-258)

| # | Vector | Defense | Test status |
|---|---|---|---|
| 1 | `git commit --no-verify` skips all hooks → no audit record | pre-push `bypass-audit-check` detects missing record for the commit SHA → hard fail | exists (integration: regression test) |
| 2 | `COA_SKIP_GATES=1.0,2.5,7` tries to skip NON_SKIPPABLE phases | pre-commit ignores COA_SKIP_GATES for NON_SKIPPABLE phases (`should_run` always returns 0) → those phases appear in `phases[]` in the record | exists (integration: COA_SKIP_GATES test) |
| 3 | Operator manually edits `.claims/commit-audit.log` to insert fake records | Log integrity (sha256 of log) is CG-R8-4-followup territory; current R8.4 documents this gap | gap (CG-R8-4-followup) |
| 4 | `git push --no-verify` skips the pre-push hook entirely | No local defense; R8.3 CI assertion (planned, CG-R8-3) closes server-side | gap (see CG-R8-3) |
| 5 | Fresh clone / new machine — no local `.claims/commit-audit.log` | bypass-audit-check skips gracefully ("no audit log") on fresh clones — designed intent; audit is local-only | exists (integration: no-log test) |
| 6 | Large log causes unbounded memory use or slow scan | parseAuditLog builds a Map keyed by commitSha; `--recent=N` limits git log scope | exists (unit tests verify Map lookup) |

### R8.5 Whitehack — evasion vectors (TPL-259)

| # | Vector | Defense | Test status |
|---|---|---|---|
| 1 | `git push --force main` | pre-push trunk-integrity-check detects non-ancestor remote SHA → refuses | exists (integration: force-push refused) |
| 2 | `git push --force-with-lease main` | `--force-with-lease` is semantically identical from the hook's perspective — remote SHA still not an ancestor → refused | exists (same ancestry check covers both) |
| 3 | `git update-ref refs/heads/main <sha>` directly | local-only plumbing; bypasses all hooks including pre-push. **Operators must enable remote branch protection on their hosting platform** (GitHub: Settings → Branches → Branch protection rules → Disallow force pushes + Restrict who can push; GitLab: Settings → Repository → Protected branches; Gitea: Settings → Branches). This is the required second-layer defense for all three local-bypass vectors (rows 3, 5, 7). R8.3 CI assertion will add a programmatic check once CI infrastructure is decided. | closed (CG-R8-5-remote — guidance added to whitehack table, TPL-268) |
| 4 | `COA_OPERATOR=1 COA_FORCE_TRUNK=1` legitimate override | allowed but audited to `.claims/audit.log` with timestamp + operator identity + refs | exists (integration: operator override writes audit record) |
| 5 | `git push --no-verify` skips pre-push hook entirely | no local defense once `--no-verify` is used. **Remote branch protection (see row 3) is the required second-layer defense.** R8.3 CI assertion (planned, CG-R8-3) will close server-side programmatically. | gap (see CG-R8-3; remote branch protection is the operator-side mitigation — see row 3) |
| 6 | Force-push to non-trunk branch (e.g. `tx-TPL-999`, `feature-x`) | allowed by design — R8.5 only gates trunk refs | exists (integration: non-trunk force-push allowed) |
| 7 | `git config core.hooksPath=/dev/null` to disable hook | no local defense; R8.3 CI assertion (planned) closes server-side | gap (same as R8.2 vector 6) |

### Test coverage gaps

- **CG-R8-1** — Closed by TPL-284 (ADR-0022). Bootstrap warn-only period expired: 113+ post-R8.4 commits with no false-positive incidents; R8.4 pre-push promoted to hard-fail. Warn-only period ran from TPL-258 to TPL-284.
- **CG-R8-2** — Closed by TPL-256. R8.2 landed: non-skippable Phase 1.0 + pre-push catch-net + operator-gated registry update.
- **CG-R8-3** — CI assertion: CI workflow runs all pre-commit phases server-side. **Size: large. Dependencies: CI infrastructure decision.**
- **CG-R8-4** — Closed by TPL-258. R8.4 landed: pre-commit phase tracking + post-commit SHA finalization + pre-push hard-fail check.
- **CG-R8-4-followup** — Audit log integrity: sha256 of `.claims/commit-audit.log` in a separate file would prevent fake-record injection. **Size: small.**
- **CG-R8-5** — Closed by TPL-259. R8.5 landed: trunk-integrity-check in pre-push; ancestry-based force-push detection; operator override audited.
- **CG-R8-5-remote** — Closed by TPL-268. Remote branch protection guidance added to R8.5 whitehack table (rows 3 and 5). Operators must enable hosting-platform branch protection (GitHub / GitLab / Gitea) as the required second-layer defense against `--no-verify` and direct `git update-ref` bypasses.

---

## R9 — Test-deletion guard (Phase 2.6 — net-deletion detection on test()/it() blocks)

**Statement.** No commit may stage a unified diff whose net `test()` /
`it()` block-count change across `tests/**` (and `scripts/**`)
test-suffix files is negative, unless the operator authorizes the
deletion via two factors: `COA_OPERATOR=1` in the environment AND a
`Allow-test-deletion: <reason ≥3 chars>` line in the commit-message
body.

**Why.** D6's BYO-LLM evaluation surfaced an F8 failure mode on
Variant B (Qwen3.6-35B-A3B running locally through aider): the model
edited multiple test blocks in one pass and net-removed coverage with
no signal to any existing gate. Header-check, architecture-check, and
the test runners themselves were silent — deleted tests cannot fail.
The synthesis (`docs/analysis/session-summaries/2026-05-06_D6-CrossVariant-synthesis.md`
§3) named this as the highest-priority public-launch blocker for
BYO-LLM. The defense is universal: cloud agents and humans can
silently drop coverage with the same shape; the local-LLM run
provided the cheap, repeatable surfacing.

**Category:** A — Enforced (regex-based static check + non-skippable
phase + two-factor operator override + override reason logged).
**Defined in:** `docs/adr/0041-test-deletion-guard.md`,
`.claude/CLAUDE.md` (Enforced rules section).
**Owner script:** `scripts/checks/test-deletion-guard.mjs`.
**Pre-commit phase:** 2.6 — non-skippable (in `NON_SKIPPABLE_PHASES`).
**Operator override:** `COA_OPERATOR=1` env var **AND**
`Allow-test-deletion: <reason ≥3 chars>` line in the commit-message
body. Both required; neither alone sufficient. Reason is logged to
stderr by the guard for traceability.
**Coa-merge integration:** `coa-merge.mjs:1631` invokes
`run('git', ['commit', '-m', commitMessage], ...)`. Git writes the
`-m` text verbatim to `.git/COMMIT_EDITMSG` before pre-commit fires,
so the override line in `--message="..."` reaches the guard intact
including for multi-line bodies.
**Test surface:** `tests/integration/test-deletion-guard.test.mjs`
(15 scenarios — 4 pass paths including describe-flatten false-positive
defense, 5 block paths, 1 allow path, 1 skip path, 1 coa-merge
passthrough, 3 whole-file deletion regression scenarios added by
TPL-323).
**Cross-references:** R1 (Phase 2.5 sits next to 2.6), R2 (Phase 2.7
sits next to 2.6), R8.2 (hook integrity, TPL-256 — Phase 1.0 fires
before all of 2.5/2.6/2.7).

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Rename test (`test('foo')` → `test('foo bar')`) | net-counting nets 0 (one removed, one added) | — | exists (Test #2 — rename only) |
| 2 | Replace one `test()` with multiple smaller ones | net-counting passes (more added than removed) | — | exists (covered by net-count semantics) |
| 3 | Convert `test()` to a differently-named call (`runTest()`, `mySuiteRun()`) | regex pinned to `\b(?:test\|it)\s*\(`; differently-named calls don't match by design — the corner case is documented in ADR-0041 with operator override available | extend to common runner-specific names if CI surfaces a class | gap (documented) |
| 4 | Stage the deletion outside `tests/**` | scope discipline matches existing R1 walker; off-path tests are not enforced. Mitigation: a rename out of `tests/**` is a code review surface | — | exists (Test #10 — non-test path skipped) |
| 5 | Set `COA_SKIP_GATES=2.6` to skip the phase | Phase 2.6 is in `NON_SKIPPABLE_PHASES`; `should_run` short-circuits before SKIP_PHASES is consulted | meta-test pinning the literal `2.6` in `NON_SKIPPABLE_PHASES` | partial — see CG-R9-1 |
| 6 | Tamper with the guard script to weaken regex | guard is in `protectedPaths` (claim coverage); R8.2 hook-integrity (Phase 1.0) catches tampered hook wiring before this phase runs | self-test fixtures pinning regex shape (mirror of R1's `--self-test`) | gap — see CG-R9-2 |
| 7 | Bypass via `--no-verify` | R8 hook-integrity layer (Phase 1.0 + pre-push catch-net) closes this on the same surface as R1/R2 | — | exists (R8.2 / R8.5) |
| 8 | `COA_OPERATOR=1` env without marker line | guard requires both factors; env alone refused | — | exists (Test #6, #8) |
| 9 | Marker line without `COA_OPERATOR` | guard requires both factors; line alone refused | — | exists (Test #9) |
| 10 | `Allow-test-deletion:` line with sub-3-char reason | regex captures the trimmed value; reason length checked ≥3 | — | exists (Test #9b) |
| 11 | Edit the marker line at amend time | amend = new commit; pre-commit fires again; same gate applies | — | exists (semantics — `git commit --amend` is a fresh commit) |
| 12 | Delete an entire test file (whole-file deletion) instead of individual `test()` blocks | **was a gap before TPL-323** — `parseDiff` was resetting `currentFile` to `null` on `+++ /dev/null`, dropping all deletion-line counts for the deleted file; guard silently passed. Fixed: `parseDiff` now preserves the pre-image path set by `--- a/<path>` when post-image is `/dev/null`; whole-file deletion of N `test()`/`it()` blocks correctly counts as N net deletion and blocks unless two-factor override. Covered after TPL-323. | — | exists (Tests #13, #14, #15 — added by TPL-323) |

**Explicit non-vector — describe-wrapper removal.** Removing a
`describe()` wrapper while preserving inner `test()`s is a
**legitimate organizational refactor**, not an evasion vector. Block-
count scope is `test()`/`it()` only by design (Design Call A in
ADR-0041); the false-positive class around describe-flatten and
describe-add is eliminated structurally. Test #3 pins this
defense — a flatten that drops a describe but preserves both inner
tests must pass cleanly.

### Test coverage gaps

- **CG-R9-1** — Meta-test pinning the literal `2.6` inside
  `NON_SKIPPABLE_PHASES` in `.githooks/pre-commit`. Defense against
  accidental edit. **Size: small.**
- **CG-R9-2** — `--self-test` mode for `test-deletion-guard.mjs`
  with canned good/bad diff fixtures, mirroring R1's pattern. Runs
  before the real scan in pre-commit. **Size: small.**
- **CG-R9-3** — `package.json` invariant: `test:*` scripts must
  exercise `tests/integration/test-deletion-guard.test.mjs`
  alongside the rest of the integration suite. **Size: small.**
- **CG-R9-4** — Extend the guard to `.ts` / `.tsx` test files
  uniformly when those formats land in the repo (TEST_FILE_RE already
  lists them; verify by adding fixtures once a real `.test.ts` exists
  in-tree). **Size: small.**

---

## R10 — Sidecar referent integrity check (Phase 6 advisory)

**Statement.** Every `*.header.md` sidecar's referent fields, when
present, must resolve: `fileId:` matches the canonical derivation from
the source path (dot-preserving or dot-stripping form), each `tests:`
entry that looks like a path exists on disk, and `module:` references
an existing directory. Advisory by default — warnings printed, exit 0;
hard-fail mode requires `COA_OPERATOR_PROMOTE_SIDECAR_CHECK=1`.

**Why.** The D6 BYO-LLM cross-variant evaluation surfaced **F9 —
sidecar metadata hallucination**: Devstral 24B (Mistral SWE-tune)
fabricated a synthetic kebab-case `fileId: sample-mjs-header` and a
nonexistent `tests:` path, both passing header-check (R8) cleanly
because R8 validates *shape*, not whether values *refer to anything*.
F9 is lower severity than F8 (it produces false documentation, not
broken code) but erodes the load-bearing function of sidecars (cheap
navigation and cross-reference). Defense is universal across local
LLMs, cloud agents, and humans.

**Category:** A — Enforced (deterministic check + promotion env for
hard-fail; advisory mode chosen because trunk carries pre-existing
drift baseline).
**Defined in:** `docs/adr/0042-sidecar-referents-check.md`,
`.claude/CLAUDE.md` (no enforced-rules block change — advisory).
**Owner script:** `scripts/checks/sidecar-referents-check.mjs`.
**Pre-commit phase:** 6 — skippable (advisory).
**Operator promotion:** `COA_OPERATOR_PROMOTE_SIDECAR_CHECK=1` env var
turns warnings into a non-zero exit. No second factor required because
the base behavior is non-blocking; this single factor is the entire
gate to hard-fail mode.
**Audit mode:** `node scripts/checks/sidecar-referents-check.mjs --audit`
walks every tracked `*.header.md` in the repo (skipping `node_modules`,
`.git`, `.backups`). Default mode walks only the staged sidecar set.
**Test surface:** `tests/integration/sidecar-referents-check.test.mjs`
(10 scenarios — 2 pass paths, 4 warn paths, 1 hard-fail-promotion path,
1 malformed-skip path, 2 mode-dispatch paths).
**Trunk audit baseline at TPL-316 commit time:** 445 warnings across
1503 sidecars (270 fileId, 138 tests, 24 module, 13 unparseable).
**Cross-references:** ADR-0009 (sidecar format spec), ADR-0041
(test-deletion-guard — sibling deterministic-gate from TPL-314), R8
(header-check — owns sidecar *shape* validity; this rule owns
*referent* validity).

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Fabricate `fileId` as plausible kebab-case (the F9 shape) | path-derivation comparison; both dot-preserving and dot-stripping forms accepted; anything else flagged | — | exists (Test #3 — F9 hallucination shape) |
| 2 | Fabricate `tests:` path that "would make sense" but doesn't exist | `fs.existsSync` per entry; mixed valid/invalid lists report only the missing one | — | exists (Tests #4, #5) |
| 3 | Pick a valid module name but for the wrong file | `module:` directory existence check passes; cross-reference to module's exposed-files manifest is NOT defended | future hardening — needs module-manifest exposed-files cross-check | gap (documented) |
| 4 | Mass-add `_none_` placeholders in sidecar fields | NOT this rule's surface — header-check (R8) `checkNotesForLLMFiller()` and ADR-0009 sparse-format enforcement own this | — | exists (R8) |
| 5 | Embed command in `tests:` to dodge fs check (`tests: node scripts/x.mjs`) | command-prefix skip is deliberate — committed sidecars use `tests:` for runnable commands too. NOT a vector by design | — | exists by design |
| 6 | Promote env subverted (`COA_OPERATOR_PROMOTE_SIDECAR_CHECK=0` after agent-set 1) | env is read at start of run; subversion is just "advisory mode", which is the default. No incremental harm. | — | n/a |
| 7 | Bypass via `--no-verify` | R8 hook-integrity layer (Phase 1.0 + pre-push catch-net) catches tampered hook wiring; the rule itself is advisory so the bypass cost is even lower | — | exists (R8.2) |
| 8 | Skip Phase 6 via `COA_SKIP_GATES=6` | Phase 6 is skippable by design — this rule is advisory | promotion to non-skippable when baseline ≤5 warnings | gap — see CG-R10-1 |
| 9 | Tamper with `deriveFileId` to widen accepted forms | guard is in operator-claim coverage; no `--self-test` mode yet | self-test fixtures pinning derivation outputs | gap — see CG-R10-2 |
| 10 | Author a malformed sidecar to force "could not parse" skip | malformed sidecars *are* warned (just not crashed); header-check (R8) catches the shape error separately | — | exists (Test #8) |

**Explicit non-vector — omitting referent fields entirely.** A sparse
sidecar with only `summary:` and no `fileId`/`tests`/`module:` is a
**valid pattern per ADR-0009**, not an evasion. This rule only
validates fields that are *present*; absence is silence, not a
warning. Test #2 pins this.

### R10 Test coverage gaps

- **CG-R10-1** — Promote Phase 6 sidecar-referents-check to
  non-skippable + default hard-fail once trunk audit baseline drops to
  ≤5 warnings. Add a meta-test pinning the literal phase number.
  **Size: small.**
- **CG-R10-2** — `--self-test` mode for `sidecar-referents-check.mjs`
  with canned good/bad sidecar fixtures, mirroring R1's pattern. Runs
  before the real walk. **Size: small.**
- **CG-R10-3** — Cross-reference `module:` against the named module's
  exposed-files manifest (closes vector #3). Requires a tracked
  manifest schema first. **Size: medium.**
- **CG-R10-4** — Bulk-cleanup slice to drive trunk audit baseline from
  445 → ≤5 warnings, unblocking CG-R10-1 promotion. **Size: medium.**

---

## R11 — Frozen-paths subset on active claims (P4 defense-in-depth for F12 explicit-scope)

**Statement.** A claim acquired with `--frozen=<csv>` records a
top-level `frozen: [...]` array on its JSON. `claim-check --enforce
--staged` (pre-commit Phase 3) refuses commits whose staged file set
intersects the `frozen` list of any active claim. Override requires
two factors: `COA_OPERATOR=1` in the environment AND a
`Allow-frozen-write: <reason ≥3 chars>` line in the commit-message
body. Legacy claims without a `frozen` field are unaffected.

**Why.** D6's BYO-LLM evaluation surfaced **F12 — explicit-scope
violation** on Variant 3 (Qwen3-Coder MoE running through aider): when
the slice prompt declared paths off-limits, the model retried the same
edit shape against unrelated files until something landed, including
on the explicitly forbidden paths. The synthesis
(`docs/analysis/session-summaries/2026-05-06_D6-CrossVariant-synthesis.md`
§3 backlog and §addendum) classifies F12 as **edit-format-modulated**
— the underlying retry-frenzy is suppressed once the operator switches
aider to `--edit-format whole`, which is the F11 mitigation. So in
practice F12 is rarely seen when F11 is mitigated. R11 is therefore
**defense-in-depth (P4)** for the residual case rather than urgent
surface coverage. The cost is small: one optional flag, one staging-
time intersection check, one two-factor override mirroring R9.

**Category:** A — Enforced (acquire-time field write + Phase 3 staging
intersection + two-factor operator override + override reason logged).
**Defined in:** `docs/adr/0043-claim-check-frozen-paths.md`,
`.claude/CLAUDE.md` (Enforced rules section, additive).
**Owner script:** `scripts/checks/claim-check.mjs`
(`--acquire --frozen=<csv>`, `--enforce --staged`,
`--query=<path>`, `--audit`).
**Pre-commit phase:** 3 (existing `claim-check --enforce --staged`
phase; this rule extends it rather than adding a new phase).
**Operator override:** `COA_OPERATOR=1` env var **AND**
`Allow-frozen-write: <reason ≥3 chars>` line in the commit-message
body. Both required; neither alone sufficient. Reason is logged to
stderr by the guard and written as a `frozen-override-accepted` event
to `.claims/audit.log` for traceability.
**Test surface:** `tests/integration/claim-check-frozen.test.mjs`
(14 scenarios — 5 block paths, 3 pass paths, 1 store path, 2
backwards-compat paths, 1 allow path, 1 short-reason refusal, 1
visibility path).
**Cross-references:** R9 (same two-factor override template),
C1 / C3 (claims protocol surfaces this rule extends), C4 (slice ID
uniqueness — same `--acquire` entry point).

### Whitehack — evasion vectors

| # | Vector | Defense (current) | Defense (needed) | Test status |
|---|---|---|---|---|
| 1 | Agent stages a frozen file | pre-commit `--enforce --staged` finds the intersection and refuses with a `FROZEN` block | — | exists (Tests #3, #4, #5) |
| 2 | Agent renames a frozen file (delete `frozen-path` + add `new-path`) | the deleted side still matches the frozen list and the rename triggers; the new path is not auto-frozen — residual gap | extend `getStagedFiles` to surface rename-source paths in addition to current names | gap — see CG-R11-1 |
| 3 | Agent edits the frozen file in a nested working copy (linked worktree, submodule) | `claim-check` reads `.claims/` from `resolveMainRepoRoot()` so the active claim is found; pre-commit always fires in the worktree where the commit is being created | — | exists (transitively — staging set is per-worktree by definition) |
| 4 | Agent uses `--no-verify` to skip pre-commit | R8 hook-integrity (Phase 1.0 + pre-push catch-net) closes `--no-verify` for the entire pre-commit surface | — | exists (R8.2 / R8.5) |
| 5 | Agent edits another agent's claim file to remove `frozen` field | claim-tampering surface; out of scope for this guard, but next acquire-time scan re-asserts the field if the original agent re-runs ceremony | claim-file integrity check (out of scope of this slice) | gap — see CG-R11-2 |
| 6 | `Allow-frozen-write:` line without `COA_OPERATOR=1` | guard requires both factors; marker alone refused | — | exists (Test #11) |
| 7 | `COA_OPERATOR=1` env without marker line | guard requires both factors; env alone refused | — | exists (Test #10) |
| 8 | `Allow-frozen-write:` line with sub-3-char reason | regex captures the trimmed value; `FROZEN_MIN_REASON_LEN=3` | — | exists (Test #12) |
| 9 | Agent embeds `Allow-frozen-write:` in a multi-paragraph body to hide it from review | guard logs the marker verbatim to stderr and writes a `frozen-override-accepted` audit event with the reason | — | exists (Test #9 — stderr assertion) |
| 10 | Agent uses `claim-check --extend` to remove the `frozen` field | `--extend` only adds targets; it does not strip top-level fields | meta-test pinning extend-preserves-frozen | gap — see CG-R11-3 |

**Explicit non-vector — legacy claims without a `frozen` field
bypass enforcement.** This is **by design** (backwards
compatibility). The whole rule mode is opt-in per claim — no slice
that does not declare a frozen list pays any complexity cost, and no
historical claim corpus suddenly behaves differently after this
slice lands. Tests #6 (legacy claim shape) and #7 (no-flag acquire)
pin the contract.

### R11 Test coverage gaps

- **CG-R11-1** — Rename-detection extension. When a staged diff
  includes a rename whose source path is frozen, fire on the source
  path even if the destination is not. Requires switching
  `getStagedFiles` to surface both halves of `git diff --cached
  --name-only --find-renames` rows. **Size: small.**
- **CG-R11-2** — Claim-file integrity meta-check. Scan
  `.claims/clm-*.json` between commits and refuse to land a commit
  that strips the `frozen` field from a foreign agent's claim. Likely
  belongs as a sibling pre-commit phase or as part of a future
  C-rule. **Size: medium.**
- **CG-R11-3** — Meta-test pinning that `claim-check --extend`
  preserves the `frozen` field unchanged when called on a claim that
  has one. Closes vector #10 with a fixture. **Size: small.**
- **CG-R11-4** — Promotion criteria. Once a real F12 incident is
  caught by R11 in the wild (audit log shows
  `frozen-override-accepted` events that flagged genuine
  cross-cutting hits), revisit the priority — currently P4 because
  F11's `--edit-format whole` mitigation already suppresses the
  trigger. **Size: small (decision-only).**

---

## W1 — Main-worktree dirt audit (warn-only)

**Statement.** When a commit is attempted from the main worktree, the
pre-commit Phase 0.5 script enumerates untracked files in `tests/`,
`apps/`, `modules/`, `scripts/`, and `docs/` that are not known-OK
(claim files, node_modules, .backups, _generated). If any are found, it
emits a warning to stderr identifying them as potential residue from a
tx-* session that accidentally edited in main. The script always exits 0
— this is warn-only, never blocking.

**Why.** Wave C: Zvenix's main worktree accumulated 22 stale
`.claims/clm-*.json` files and `tests/.scratch/` residue left by sessions
that edited in main instead of their transport worktree. R5 blocks commits
from main but not file edits. Without W1, the residue is invisible until a
manual `git status`. With W1, the operator sees it on the next commit
attempt from main.

**Category:** A — Enforced (warn-only initially; promotion to fail-on
tracked as a future slice).  
**Defined in:** `docs/adr/0021-auto-teardown-and-dirt-audit.md`.  
**Owner script:** `scripts/checks/main-worktree-dirt-audit.mjs`.  
**Pre-commit phase:** 0.5 — skippable (NOT in `NON_SKIPPABLE_PHASES`).  
**Test surface:** `tests/unit/main-worktree-dirt-audit.test.mjs`.  
**Cross-references:** R5 (Phase 0 non-skippable guard precedes Phase 0.5),
R4 (audit R4 handles worktree lifecycle; W1 handles main-worktree residue),
ADR-0021.

### W1 Whitehack — evasion vectors

| # | Vector | Defense | Test status |
|---|---|---|---|
| 1 | Sonnet edits a file in main worktree, doesn't commit | Phase 0.5 warns on next commit attempt from main | exists (unit + self-test) |
| 2 | Sonnet edits in main then tx-teardown leaves residue | next main-worktree commit triggers warn | exists (unit test — filterUntrackedFiles) |
| 3 | Audit fires from tx-* worktree (false positive) | `isTransportWorktreePath()` exits 0 silently when in tx-* | exists (unit test — isTransportWorktreePath) |
| 4 | Operator wants to suppress audit for legit experiment | `COA_SKIP_GATES=0.5` (Phase 0.5 is skippable) | exists by design |
| 5 | Residue in `.claims/clm-*.json` triggers false positive | known-OK filter suppresses `.claims/clm-*.json` | exists (unit test — isKnownOk) |
| 6 | Modify dirt-audit script to weaken filter | `--self-test` runs fixture cases; file in protectedPaths after next C3-update slice | partial — self-test exists; protectedPaths pending |

### W1 Test coverage gaps

- **CG-W1-1** — Add `main-worktree-dirt-audit.mjs` to `protectedPaths` so
  weakening the filter triggers a claim-check warning. Currently only
  self-test protects against tampering.
- **CG-W1-2** — Promote Phase 0.5 to fail-on after stable adoption period
  and add a non-skippable meta-test that checks the promotion.

---

## Methodology — vector dimensions used

For each rule, we considered these adversarial dimensions:

1. **Naive bypass** — agent doesn't know rule exists.
2. **Aware bypass** — agent satisfies cosmetically, breaks spirit.
3. **Tooling bypass** — flag/env/config/hook bypass (`--no-verify`,
   `COA_SKIP_GATES`, etc.).
4. **Indirection** — through helper, alternate command, dynamic exec.
5. **Tampering** — silent weakening of the rule's own enforcement code.
6. **Race** — timing/concurrency/parallel-session bypass.
7. **Migration drift** — rule unenforceable when target file format changes.
8. **Trust boundary** — rule trusts env vars / parent process / marker
   files; what if those are forged?

Not all dimensions apply to every rule. Category C rules (discipline)
are inherently process-only; their "defense" is review. Category B rules
have partial code coverage; gaps marked clearly.

## Anti-evasion for the registry itself

This document is a target for evasion (omit a rule, weaken a vector,
mark "test exists" when stub-only). Defenses:

- Each rule entry cites specific file paths for tests; reviewers can
  spot-check.
- Every backlog slice in `docs/backlog/rule-coverage-gaps.md` is sized
  ("tiny" / "small" / "medium") so hiding work as "tiny" is harder.
- Cross-reference completeness: every CLAUDE.md mention of a rule
  appears here; every ADR appears here; every `enforcedRules` entry
  appears here. Diff in either direction is a finding.
- Future: a `scripts/checks/rules-registry-coverage.mjs` (queued in
  the gaps backlog) asserts: every ADR with anti-evasion content has a
  registry entry; every `enforcedRules` entry has one; every registry
  entry cites at least 3 vectors.
