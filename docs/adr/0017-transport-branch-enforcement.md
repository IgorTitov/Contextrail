<!-- @HEADER
@version 0.7.73 | 2026-05-04
@purpose Document ADR-0017 — transport-branch enforcement (R2): all commits land on trunk or tx-<slice> branches; ceremony bumps gated by a coa-merge marker.
@sidecar 0017-transport-branch-enforcement.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0017 — Transport-branch enforcement (R2)

## Status

Accepted at v0.7.39.

## Context

Between 2026-04-27 and 2026-04-28, three Zvenix backport sessions
(TPL-221, TPL-222, TPL-233) were dispatched to work on operator-named
long-lived branches:

- `tpl222-backport`
- `zvx-053-tpl233-backport`
- (a third planned but not landed before recovery)

Each branch:

- Held its own `VERSION` bump in the backport commit, racing with
  trunk's parallel `VERSION` bumps (TPL-233 hit it: branch claimed
  `0.11.176`, trunk claimed `0.11.176` then `0.11.177` in the meantime).
- Lived for hours-to-days, accumulating divergence (8-file conflict
  at merge time).
- Was not torn down after merge, leaving stale worktrees that the
  operator had to manage manually.

ADR-0002:108 explicitly says **"Short-lived branches are acceptable
as transport"** and `docs/guides/parallel-sessions.md:202` (pre-R2)
said **"Never feature branches"**. The intended model is: branch as
transport vehicle for one atomic slice, ff-merged into trunk, deleted.
But that intent existed only as prose. The tooling did not enforce
it, so the next operator under pressure reached for `git checkout -b
tpl222-backport` and walked off the convention.

R2 closes the gap by making the long-lived backport-branch shape
**structurally impossible** at the tooling level.

## Decision

Adopt **R2 — transport-branch enforcement** as the third enforced
rule (after R1 test-isolation, R4 worktree-lifecycle):

> **Every commit lands either:**
> **(a)** directly on trunk (`main` / `master`), OR
> **(b)** on a transport branch matching `tx-<slice-id>` shape, which:
>   - was created via `coa-worktree --create --slice=<id>`
>   - never carries a `VERSION` / `CHANGELOG.md` / `package.json` bump
>     except via a coa-merge ceremony marker (one of those
>     bumps without a fresh marker is refused at pre-commit)
>   - is ≤ 24h old at warn time / 168h at refuse time
>   - is fast-forward-merged into trunk by `coa-merge` and left
>     eligible for `coa-worktree --teardown-stale` cleanup

Any commit attempt on any other branch shape is refused at pre-commit
time.

### Branch-name regex (canonical)

```
/^tx-([A-Z][A-Z0-9]*)-(\d+)(-[a-z][a-z0-9]*)?$/
```

Examples accepted:

- `tx-TPL-234`
- `tx-AIC-088` (Cockpit prefix)
- `tx-ZVX-053` (Zvenix prefix)
- `tx-TPL-227-interim` (suffixed slice ID)

Examples actively rejected with specific error messages:

- `feature/foo`, `feat/bar`, `fix/baz` — banned via banlist with the
  reason "violate trunk-based delivery (ADR-0002)".
- `tpl234-backport`, `backport-tpl234` — banned with the reason
  "the 2026-04 anti-pattern R2 closes".
- `tpl-234`, `tx-tpl-234` (lowercase) — fall through to the generic
  "neither trunk nor a transport branch" message; the canonical
  uppercase project prefix is observable to humans via the regex.

### The merge marker

`coa-merge.mjs` enters transport-mode when the current branch matches
the transport regex. Before staging the ceremony files
(`VERSION` / `package.json` / `CHANGELOG.md`), it writes a JSON marker
file at `<repoRoot>/.claims/.coa-merging.lock`:

```json
{
  "pid": <coa-merge process.pid>,
  "branch": "tx-<slice>",
  "ts": <Date.now() at write time>
}
```

The pre-commit hook's Phase 2.7 (`scripts/checks/transport-branch-check.mjs`)
inspects the marker when ceremony files are staged on a transport
branch and refuses the commit unless **all** of the following hold:

1. The marker exists.
2. The marker's `branch` field equals the current branch.
3. The marker's `ts` is within 5 minutes of `Date.now()` (older
   markers signal a previous coa-merge that crashed; the operator
   must clean up).
4. The marker's `pid` appears in the hook process's parent-PID
   chain (proves the marker was written by the coa-merge that
   spawned the hook, not by an attacker writing a forged file).

If the platform's process-ancestry probe fails (no `ps`, no `wmic`),
the checker soft-passes with a stderr warning — the time + branch
gates are still load-bearing on their own. ADR-0017's anti-evasion
matrix calls out this gap and the future R8 (hook integrity, planned)
that closes it from a different angle.

`coa-merge` registers `process.on('exit', removeMarker)` so any
crash path also unlinks the marker. On commit success, coa-merge
removes the marker explicitly before stepping into the ff-push.

### Transport-mode coa-merge flow

When `branch matches /^tx-/`:

1. **Detect mode** at startup; refuse `unknown` (neither trunk nor
   transport) with a copy-pasteable hint pointing at
   `coa-worktree --create --slice=`.
2. **Capture `mainShaAtEntry`** = `git rev-parse main` BEFORE any
   mutation. This is the value used for `--force-with-lease` later.
3. **Rebase** the transport branch onto local main
   (`git rebase main`). Idempotent when no divergence; aborts and
   surfaces the operator-actionable error on conflict.
4. **Write marker** with current pid, branch, ts.
5. **Compose+write ceremony files** (existing TPL-222 J1 deferred
   mutation; rollback on failure).
6. **Commit** (pre-commit hook fires; Phase 2.5 R1 + Phase 2.7 R2
   both validate).
7. **Auto-complete claims** (existing).
8. **ff-update** into local main, repo-shape-aware (F12 / TPL-237):
   - Bare repo → `git update-ref refs/heads/main HEAD <mainShaAtEntry>`
   - Non-bare with main checked out elsewhere → `git push
     --force-with-lease=main:<mainShaAtEntry> <main-wt-path>
     HEAD:refs/heads/main` (requires
     `receive.denyCurrentBranch=updateInstead` on the destination)
   - Non-bare with no main worktree → `update-ref` + stderr warning

   The `--force-with-lease` value is exactly the `mainShaAtEntry`
   captured at step 2; if main moved during the ceremony, the
   push/update-ref fails and coa-merge surfaces a re-rebase hint.
   When `receive.denyCurrentBranch` is missing on a non-bare
   destination, coa-merge refuses with the exact one-time setup
   command in the error.
9. **Remove marker**.
10. **Push to remote** (optional, behind `--push`).

The branch itself is **not** deleted by coa-merge — the worktree is
checked out on it, so a direct `git branch -D` would fail. After
the ff-push, the branch's HEAD == main, so R4's audit verdict for
the worktree becomes `clean-merged` and the operator can run
`coa-worktree --teardown-stale --execute` (operator-gated, dry-run
required) to clean up both the worktree and the now-redundant
branch. This deferral is intentional: cleanup belongs to R4's
existing operator-gated path rather than racing it from inside R2.

### Anti-evasion matrix

| Evasion | Defense | Verification |
|---|---|---|
| `git checkout -b feature-xyz` then commit | pre-commit Phase 2.7 refuses non-trunk non-tx branches with a banned-pattern reason | Integration test 3 (feature/foo refused with banned reason). |
| `git checkout -b tx-FAKE-999` to fake transport | name regex passes BUT no marker → ceremony files refused; non-ceremony commits are allowed which is the correct outcome (the fake branch buys nothing useful — code is still trackable) | Integration tests 7, 8, 12 (no marker → refuse on ceremony; pass on plain code). |
| Set `COA_MERGING=1` env to bypass marker check | marker uses file + JSON content + PID match, not env var; no env override exists | Code review of `checkMarker()` — no env bypass path. |
| Manually write marker file with own PID | marker is validated against caller's parent-PID chain; the running checker process can't be its own parent | Integration test 13 (pid=1 not in chain → refuse, when probe works). |
| Bypass pre-commit with `--no-verify` | R8 (hook integrity, planned slice) closes this; meanwhile note in ADR | Open gap; tracked. |
| Squash branch's commits + force-push to main directly | The push targets a different ref (HEAD:refs/heads/main) and the only sanctioned path through coa-merge requires marker + rebase + commit; bypassing means no marker, ceremony commit refused | Implicit in design; integration tests 7-11. |
| Rename main to bypass branch check | `isTrunkBranchName` accepts only `main` / `master`; renaming main to `main2` makes its commits fail Phase 2.7 | Unit tests 19-23. |
| Modify check itself to weaken regex | self-test mode runs first in pre-commit and pins all accepted/rejected names; the file is in `.claims/config.json` `protectedPaths`; the unit suite's frozen-table tests fail loud on mutation | Self-test in pre-commit + unit tests 31-37 + protectedPaths entry. |
| Add a banlist exemption | banlist is `Object.freeze`-d (BANNED_BRANCH_PATTERNS); mutation throws | Unit test 37. |
| Old `--name=` worktree creation to skip --slice= | deprecation warning emitted on stderr; the `--name=` path doesn't choose a tx-* branch, so its worktree only contributes commits if the operator switches to main inside it (where R2 doesn't object). Transitional gap by design — full removal queued for a future slice. | Code review of `coa-worktree --create`. |
| coa-merge `--transport` flag set without being on tx-* | coa-merge doesn't expose a `--transport` flag; it auto-detects from branch name via `classifyCoaMergeMode()` | Code review + integration tests 18-24 (classifyCoaMergeMode). |
| Run two coa-merge concurrently to race the marker | The second coa-merge sees the existing marker (mutex semantics) and the marker check refuses — second commit's pre-commit Phase 2.7 reads the first's marker, sees a branch mismatch (or, if same branch, a PID mismatch since the second's PID isn't an ancestor of the first), and refuses | Integration test 25 plus the marker file uniqueness invariant. |
| Set marker.ts to the future to evade the staleness check | The age check rejects negative ages too (`age < 0` → refuse); a clock-skewed marker can't slip through | `checkMarker()` includes the explicit `if (age < 0)` branch. |
| Reuse a marker after coa-merge crashes mid-flow | `process.on('exit', cleanupMarker)` removes the marker on any exit; the staleness check is the second line of defense | Code in `coa-merge.mjs` |
| `git update-ref` from transport worktree leaves main worktree desync'd (F12 incident) | `classifyFfUpdateMethod()` routes non-bare repos with main checked out elsewhere through `git push --force-with-lease` against the main worktree path with `receive.denyCurrentBranch=updateInstead`; refuses with operator-actionable command when the config is missing; auto-config is intentionally NOT the default | Integration tests F12.1-F12.5 plus unit tests 107-117 |
| Operator sets `receive.denyCurrentBranch=ignore` to silence F12 refusal | `checkUpdateInsteadConfig()` accepts ONLY the literal `updateInstead` value; `ignore`, `warn`, `refuse`, empty, non-string all return false | Unit tests 100-106 |
| Force the push when main worktree is dirty by adding `--force` | Only `--force-with-lease=main:<oldSha>` is sanctioned; updateInstead's built-in semantics refuse the push outright on a dirty destination working tree (verified at git layer) | Integration test F12.2 |
| Detected as bare when it isn't (config tampering) | coa-merge cross-checks `git config core.bare` with `git rev-parse --is-bare-repository`; both must agree to qualify as bare. One-true-one-false falls through to the safer non-bare path | `coa-merge.mjs` step 9c probe; tampered configs route to non-bare classifier branch |

If a vector not listed here is discovered, add a fixture, extend the
detection, and append a row to this matrix in the same commit.

### F12 patch — repo-shape-aware ff-update (TPL-237)

The original R2 transport-mode flow used
`git update-ref refs/heads/main HEAD <oldSha>` to advance the trunk
ref from inside the transport worktree. That works for the ref but
does NOT touch any other worktree's working tree. When main is
checked out elsewhere (the template's typical setup), the ref jumps
forward but the operator's main worktree stays at the old content —
the F12 incident shape (90 files diverged, 16 R2 implementation
files missing from main worktree even though they existed in HEAD).

The fix routes the ff-update by repo shape via
`classifyFfUpdateMethod()` in `scripts/lib/transport-branch.mjs`:

| Repo shape | Method tag | Behavior |
|---|---|---|
| Bare repo (`core.bare=true` AND `--is-bare-repository=true`) | `update-ref-bare` | unchanged from R2 baseline — no working tree to sync |
| Non-bare, main not checked out anywhere | `update-ref-no-main` | unchanged + stderr warning so the operator notices the orphan setup |
| Non-bare, main checked out elsewhere, `receive.denyCurrentBranch=updateInstead` | `push-update-instead` | `git push --force-with-lease=main:<oldSha> <main-wt-path> HEAD:refs/heads/main` — atomically advances ref AND syncs the destination working tree; refuses on dirty destination by git's built-in semantics |
| Non-bare, main checked out elsewhere, config NOT updateInstead | `refuse-needs-config` | coa-merge refuses with the exact one-time setup command in the error; auto-configure is intentionally NOT the default so we don't silently mutate the destination repo's config |

`--force-with-lease=main:<oldSha>` is retained for the push path so
the CAS-against-inter-session-movement guarantee from R2 baseline
still catches a sibling session that committed to main mid-ceremony.

### Required one-time setup for non-bare repos

For non-bare repositories where main is checked out at the project
root (template's typical setup), R2 transport-mode requires
`receive.denyCurrentBranch=updateInstead` to be set on the main
worktree. This makes `git push` to the checked-out branch atomically
advance both the ref AND the working tree, refusing if the working
tree is dirty (built-in safety).

One-time setup:

    git -C <repo-root> config receive.denyCurrentBranch updateInstead

Without this, R2 ceremony refuses with the same command in the error
message. Bare repositories skip this requirement and continue using
update-ref unchanged.

## Consequences

### Positive

- Long-lived backport branches become structurally impossible. A new
  operator-under-pressure who reaches for `git checkout -b
  tpl234-backport` is refused at pre-commit with a copy-pasteable
  fix.
- Ceremony bumps are tied to the coa-merge ceremony — no path lets a
  rogue commit bump VERSION on a side branch.
- The `--force-with-lease` ff-push catches inter-session main
  movement at the moment it would otherwise create a divergence.
- The marker file is small, cheap, and indexed in the same `.claims/`
  dir as the rest of the coordination artefacts.
- R4's existing `--teardown-stale` flow becomes the natural cleanup
  path: post-coa-merge, the tx-<slice> worktree is `clean-merged`,
  awaiting the operator's audit-gated cleanup.

### Negative / cost

- One more pre-commit phase (2.7) is added. Self-test runs first
  and is sub-millisecond; the real check spawns 2-3 git commands
  (rev-parse, diff --cached, possibly ps/wmic). Net cost: ~50ms per
  commit on the median path, more on the marker-validation path.
- The deprecation of `coa-worktree --create --name=` is transitional;
  the path stays alive but emits a stderr warning. A future slice
  deletes it.
- The PID-chain heuristic is platform-dependent and falls back to a
  soft-pass on systems where `ps` and `wmic` are unavailable. R8
  (hook integrity) is the planned long-term defense.
- Branch deletion of `tx-<slice>` after the ff-push is deferred to
  R4's operator-gated cleanup. A worktree ledger of "branches that
  could be deleted now" is implicit (the audit's `clean-merged`
  verdict).

### Future work

- **R5 (templates)**: small slice that ships canonical
  `coa-worktree --create --slice=<id>` invocations in the docs +
  agent dispatch templates so the path is the obvious one.
- **R6 (merge-ceremony doc + drift check)**: a check that pins the
  documented ceremony steps against the implemented coa-merge code
  so the two cannot drift.
- **R8 (hook integrity)**: closes the `--no-verify` bypass.
- **Backport to Cockpit and Zvenix**: separate slices once the
  template commit lands and operates clean for one cycle.
- **F8 (spec-check pattern strictness for suffixed IDs)**: R2's
  branch-name regex accepts `tx-TPL-227-interim`; spec-check's ID
  pattern is a separate concern tracked elsewhere.

## Related decisions

- **ADR-0002** — Trunk-Based Delivery; this ADR makes the "branches
  are transport, not feature workspace" property explicit at the
  tooling layer.
- **ADR-0008** — inter-agent coordination protocol; the `.claims/`
  directory shared with claim-check is reused for the marker file.
- **ADR-0009** — header structure (slim inline + sparse sidecar).
- **ADR-0014** — per-file `@version` semantics; the ceremony files
  R2 protects (`VERSION`, `CHANGELOG.md`, `package.json`) are the
  same trio TPL-222 J5 auto-extends claims for.
- **ADR-0015 (R1)** — test isolation enforcement; every R2
  integration test goes through `safeGit` / `safeGitSpawn`, and
  Phase 2.7 sits next to Phase 2.5 in the non-skippable phases set.
- **ADR-0016 (R4)** — worktree lifecycle; R4's audit recognizes
  `tx-<slice>` worktrees through its existing 8-verdict taxonomy
  (no expansion needed) and `--teardown-stale` is the cleanup
  path post-ff-push.
- **TPL-222** — coa-merge atomicity (J1-J5); R2 builds on the
  marker pattern J4 introduced for half-baked-state.
- **TPL-225** — `claim-check --force-expire` two-part operator
  gate; R2 reuses this pattern for the 7d-age refusal override.
- **TPL-237 (F12 patch)** — repo-shape-aware ff-update; the original
  R2 `git update-ref` path desynced main worktree files when main
  was checked out elsewhere. Closed by `classifyFfUpdateMethod()`
  routing through `git push --force-with-lease` with
  `receive.denyCurrentBranch=updateInstead` for the non-bare main-
  checked-out-elsewhere case. See the F12 patch section above.
- **TPL-265** — Step 9c config capture/rollback defenses. See the
  risk + mitigation section below.

## Risk + mitigation: PUSH_UPDATE_INSTEAD config mutation (TPL-265)

Step 9c sets `receive.denyCurrentBranch=updateInstead` on the target
repo's `.git/config` to allow `git push --force-with-lease` to update the
main worktree's working tree (F12 / updateInstead semantics). If this code
runs from the wrong worktree or is invoked by accident, the WRONG repo's
config gets mutated and there is NO ROLLBACK on error.

Cockpit incident AIC-116 (2026-05-04): a Cockpit variant of coa-merge that
auto-sets `receive.denyCurrentBranch=updateInstead` was run from the wrong
context, corrupting `.git/config` with `bare=true`, fixture user credentials,
and a temp remote. Recovery was manual (file rewrite + `git reset --mixed`).

The same code path exists in the template's Step 9c (though the template
requires the operator to set `receive.denyCurrentBranch` manually — see
`REFUSE_NEEDS_CONFIG`). Belt-and-suspenders defenses were added in TPL-265:

**Mitigation (TPL-265):**

1. **Worktree validation**: Step 9c refuses to execute `PUSH_UPDATE_INSTEAD`
   unless the current branch is a `tx-*` transport branch. Prevents accidental
   invocation from trunk or a non-transport context.

2. **Config snapshot + rollback**: The target repo's `.git/config` is captured
   immediately before the push sequence. On any push failure, the captured
   snapshot is restored before propagating the error. Prevents partial or
   corrupted config state from persisting when the ff-update fails mid-flight.

Helper functions `captureGitConfig`, `restoreGitConfig`, and
`validatePushUpdateInsteadWorktree` are exported from `scripts/coa-merge.mjs`
and covered by unit tests and integration tests.

**Note:** Zvenix and Cockpit carry their own forks of coa-merge. The same
TPL-265 defenses need to be backported to both via separate slices.
