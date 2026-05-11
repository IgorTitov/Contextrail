<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document ADR-0016 — worktree lifecycle visibility and safe cleanup primitives (R4).
@sidecar 0016-worktree-lifecycle.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0016 — Worktree lifecycle visibility and safe cleanup (R4)

## Status

Accepted at v0.7.37.

## Context

On 2026-04-28, the Zvenix repository accumulated four simultaneous
worktrees (`zvenix`, `zvenix-tpl222`, `zvenix-tpl233`,
`zvenix-merge-tmp`) with no automated way to see:

- which worktrees' branches were already merged into trunk (safe to
  teardown)
- which had real WIP versus stamp-only `@version` residue from
  pre-commit `header-fix` runs (latter discardable, former must be
  preserved)
- which had drifted significantly from main (rebase or merge risk)

The operator had to manually `cd` into each worktree, run several
git commands, and read reflogs to understand state. Without
visibility, worktrees accumulate. Without safe cleanup primitives,
even visible stale worktrees are dangerous to remove — `git worktree
remove --force` plus `git branch -D` can lose actual WIP if the
operator misjudges.

This is a class of problem, not a one-off. The `coa-worktree.mjs`
script that creates the worktrees did not provide a way to see or
maintain them after creation; the result was accumulated debt that
slowed every subsequent parallel session and eventually forced a
recovery operation.

R4 closes the gap.

## Decision

Adopt R4 — **worktree lifecycle visibility and safe cleanup** —
implemented as three new `coa-worktree.mjs` subcommands plus two
pure-logic libraries that the integration tests pin against fixture
diff strings and verdict input records.

### The invariant

> The operator must always be able to run a single command
> (`coa-worktree --audit`) and learn exactly what each worktree's
> state is, with a verdict that names the safe next action. The
> cleanup primitives must distinguish "stamp-only residue" (safe to
> discard) from "user WIP" (must preserve), and must refuse to act
> when uncertain.

### Audit subcommand

`node scripts/coa-worktree.mjs --audit [--json] [--name=<X>]`

For every worktree in `git worktree list`, the audit collects
structured state:

- `path`, `branch`, `head`, `isPrimary`, `isMainBranch`, `ageHours`
- `status`: `dirtyCount`, `stagedCount`, `untrackedCount`,
  `unmergedCount`, `mergeInProgress`, `rebaseInProgress`
- `diffShape`: `stampOnlyCount`, `logicChangedCount`, sample of
  logic-changed paths
- `divergence`: `aheadOfTrunk`, `behindTrunk`
- `verdict` (one of eight) + `recommendation`

The verdict taxonomy (see `scripts/lib/worktree-audit.mjs`):

| Verdict | Meaning | Recommendation |
|---|---|---|
| `clean-active` | Branch IS trunk, working tree clean | leave alone |
| `clean-merged` | Merged into trunk, working tree clean | safe to teardown-stale |
| `stale-merged-with-stamp-residue` | Merged, dirty=stamp-only @version residue | refresh, then teardown-stale |
| `stale-merged-with-wip` | Merged, dirty includes logic edits | operator review — salvage WIP first |
| `divergent-with-wip` | Not merged, dirty includes logic edits | operator review — this is real work |
| `divergent-stamp-only` | Not merged, dirty=stamp-only residue | refresh, then check merge |
| `merge-in-progress` | MERGE_HEAD / REBASE_HEAD present | complete or abort the merge first |
| `unknown` | Cannot classify (e.g., divergent + clean) | manual inspection |

The classifier in `scripts/lib/worktree-audit.mjs#classifyVerdict`
is a pure function — no git calls — so unit tests pin every input
combination directly without spawning git. The script then drives
the classifier from real `git worktree list` / `git status` /
`git diff` output.

### Refresh subcommand

`node scripts/coa-worktree.mjs --refresh --name=<X> [--dry-run|--execute] [--json]`

The load-bearing safety property is the **stamp-only-diff
classifier** in `scripts/lib/worktree-refresh.mjs#classifyDiff`. A
file is `stamp-only` iff:

1. The diff text contains at least one hunk.
2. Every hunk's new-side range stays within the slim-header window
   (first 10 lines, matching ADR-0009 + grace).
3. Every removed line is paired with an added line; counts are
   equal (no pure additions, no pure deletions).
4. Every removed and every added line, after stripping the leading
   `-` / `+`, matches the slim-header `@version X.Y.Z | YYYY-MM-DD`
   pattern across all four header dialects (JS, Markdown, shell,
   HTML comment).

Anything else — whitespace-only churn, line-ending changes,
malformed hunks, renames, mode changes, hunks reaching past the
slim-header window — classifies as `has-logic`. The classifier is
**conservative**: when in doubt, return `has-logic` so the caller
preserves the file. Discarding real WIP would be silent data loss;
preserving stamp residue is at worst one extra restore step.

The refresh subcommand:

1. Re-audits the named worktree.
2. Refuses if `mergeInProgress` / `rebaseInProgress`.
3. Refuses if `stagedCount > 0` (operator's staging area is sacred).
4. Refuses if `process.cwd()` is inside the target (data race).
5. Refuses if any active claim references the worktree's branch.
6. Refuses if the named worktree is the primary.
7. Refuses if the name does not match any `git worktree list` entry.
8. For each modified file, runs `git diff --no-color HEAD --
   <file>`, classifies, and records into `stampOnly` / `hasLogic` /
   `noDiff` lists.
9. **Default mode is `--dry-run`.** Reports counts and preserved
   sample, exits 0.
10. `--execute` mode runs `git restore` on every `stamp-only` path;
    `has-logic` paths are left untouched. Reports `restored` and
    `preserved` lists.

### Teardown-stale subcommand

`node scripts/coa-worktree.mjs --teardown-stale [--dry-run|--execute] [--preserve=<branch1,branch2>] [--json]`

Aggregates over all non-primary worktrees and selects candidates by
**all** of:

1. Verdict is `clean-merged` (NOT `stale-merged-with-stamp-residue`
   — those need refresh first).
2. Branch is not the trunk branch.
3. Branch is not in the `--preserve` list.
4. No active claim references the branch in `slice` / `notes` /
   `targets`.
5. `process.cwd()` is NOT inside the candidate.

Default mode is `--dry-run`. Reports the eligible candidate list
plus the ineligible-and-why list, writes a marker file
`<repoRoot>/.claims/teardown-stale-marker-<hash>.json` keyed by
sha256 of the sorted candidate paths.

`--execute` mode requires:

- `COA_OPERATOR=1` in the calling shell (the same gate model used
  by `claim-check --force-expire` cross-agent escapes per
  TPL-225 / ADR-0008).
- A matching `--dry-run` marker (same hash, less than 1 hour old).
- A re-audit at the moment of execution — a candidate that gained
  dirty state between dry-run and execute is rejected.
- A successful append to `<repoRoot>/.claims/audit.log` BEFORE the
  worktree is removed. If the log write fails, that candidate's
  teardown aborts (atomic guarantee — no torn-down worktree
  without a paper trail).

For each accepted candidate: `git worktree remove <path>` (refuses
dirty by default — defense in depth), `git branch -d <branch>`
(refuses unmerged by default — defense in depth). The marker is
single-use: it is unlinked after `--execute` so a second invocation
cannot ride the same authorization without a fresh `--dry-run`.

## Anti-evasion matrix

Every plausible bypass path has an explicit defense.

| Evasion | Defense | Verification |
|---------|---------|--------------|
| Run `--teardown-stale --execute` without `--dry-run` first | Marker file is required and matched by candidate-set hash | Integration test 18 — `runTeardownStale --execute` without prior dry-run returns `error: /dry-run marker/`. |
| Set `COA_OPERATOR=1` in the agent shell | The COA harness does not propagate `COA_OPERATOR` to agent runs by default; same model as TPL-225's two-part operator gate. | Integration test 17 — `--execute` without `COA_OPERATOR=1` returns `error: /COA_OPERATOR=1/`. |
| Refresh silently discards logic-changed files | `classifyDiff` errs conservative across 28 unit-tested edge cases (whitespace-only, CRLF/LF, pure additions, pure deletions, renames, mode changes, malformed hunks, mixed @version + logic, out-of-window hunks). Refresh's `result.preserved` is the explicit logic-changed list. | Unit suite 28 cases + integration test 10 (mixed residue: stamp-only restored, logic-changed preserved). |
| Pass arbitrary path to `--refresh` or `--teardown-stale` | Path is resolved against `git worktree list --porcelain`; non-matches return `not found`. | Integration test 13 — refresh on non-existent name returns `error: /not found/`. |
| Run `--refresh` from cwd inside the target worktree | `isCwdInside(process.cwd(), record.path)` check fires before any mutation. | Audit + reasoning: classifier covers the path; integration test for the cwd-inside guard would require spawning a child with cwd inside the worktree, deferred. |
| Tamper with the stamp-only classifier | The classifier's invariants are pinned by the unit suite (28 cases). The slim-header range is exposed as a constant `SLIM_HEADER_RANGE = 10` and asserted by name in the unit tests. Weakening any pattern fails CI. | Unit test `parseHunkHeader` table + every `classifyDiff` case. |
| Delete the stamp-only classifier and reroute through a weaker check | `scripts/coa-worktree.mjs` imports `classifyDiff` by name from `./lib/worktree-refresh.mjs`; node module resolution fails loudly if the file is missing. Adding `.claims/config.json` protected-paths entries for both lib files prevents silent edits. | This commit extends `protectedPaths` with `scripts/lib/worktree-{audit,refresh}.mjs`. |
| Force teardown of a worktree with an active claim | `findClaimReferencingBranch` scans `.claims/*.json` for `status: active` entries whose `slice`, `notes`, or `targets` mention the branch; match returns `claim-active` ineligibility. | Integration test 22 — claim-blocked worktree appears in `ineligible` with reason `claim-active`. |
| Race a claim into existence between dry-run and execute | `--execute` re-runs the claim check at the moment of teardown; mid-flight claim acquisitions push the candidate into `failures` instead of `torn`. | Implementation: `runTeardownStale --execute` re-checks `findClaimReferencingBranch` per candidate. |
| Bypass the audit log | The append happens before `git worktree remove`. Append failure aborts that candidate (no torn worktree without a logged event). | Integration test 21 — making `<root>/.claims/audit.log` a directory makes `appendFileSync` throw, producing `failures: [...]` and the worktree stays. |
| Reuse the dry-run marker for a different candidate set | Marker is hashed by the sorted candidate-path set; any change to the set invalidates the hash, requiring a fresh dry-run. | Implementation: `hashCandidateSet(paths)` → 16-char sha256 prefix; lookup misses on a different set. |
| Reuse the marker after teardown | Marker is unlinked at the end of `--execute`. A second `--execute` finds no marker. | Implementation: `rmSync(teardownMarkerPath(...))` runs after the loop. |
| Modify the audit verdict table to misclassify | `VERDICTS` table is `Object.freeze`-d; mutation throws at runtime. The unit suite asserts the frozen status and the eight tags. | Unit test `VERDICTS table is frozen`. |
| Move the audit log to a path the operator cannot see | The path is `<repoRoot>/.claims/audit.log` — same path used by `claim-check`. The audit-log convention is established; relocating it would require an ADR change. | Documented in this ADR + `resolveAuditLogPath` constant in `coa-worktree.mjs`. |

If a vector not listed here is discovered, add a fixture, extend
the detection, and append a row to this matrix in the same commit.

## Consequences

### Positive

- Worktree state is always one command away from visible.
- Stale worktrees can be cleaned safely without losing WIP.
- Operator-gated mutations match the model already in use for
  `claim-check --force-expire` cross-agent escapes (TPL-225).
- Both pure-logic libs are testable in isolation — no git
  fixtures, no flake — so weakening the safety properties fails
  CI loudly.
- The audit log accumulates a paper trail of operator actions on
  worktrees, paralleling the claim-check audit trail.

### Negative / cost

- Two new lib files (`worktree-audit.mjs`, `worktree-refresh.mjs`)
  to maintain. Their interfaces are narrow and pinned by tests, so
  the maintenance burden is small.
- The integration test suite gains one more file (~600 LOC, 23
  scenarios) that has to be kept in sync with the script's flag
  surface. The R1 static check enforces that every test goes
  through `safeGit` / `safeGitSpawn`.
- `--teardown-stale --execute` is a real mutation of git state;
  even with the operator gate + marker + audit log, it's a sharp
  knife. Documentation (`docs/guides/parallel-sessions.md`) calls
  out the dry-run-first rule.

### Future work

- Backport R4 to the Cockpit and Zvenix sibling repositories as
  separate slices once this template commit lands.
- Consider a `--auto-refresh-then-teardown` flag that chains the
  two flows when the verdict is `stale-merged-with-stamp-residue`.
  Held back until R4 has run for at least one operational cycle.
- Consider extending the classifier to recognize sidecar
  `*.header.md` paired stamp updates as a single logical change
  rather than two independent stamp-only files.

## Related decisions

- ADR-0008 — inter-agent coordination protocol; claim-check and
  the audit log share the same trust model and storage path.
- ADR-0009 — header structure (slim inline + sparse sidecar);
  the stamp-only classifier's slim-header window comes from this
  decision.
- ADR-0014 — per-file `@version` semantics; stamp residue exists
  precisely because `@version` tracks last-content-change and the
  post-commit hook stamps eagerly.
- ADR-0015 (R1) — test isolation enforcement; every R4 integration
  test goes through `safeGit` / `safeGitSpawn` and the static check
  rejects any direct `execSync('git ...')`.
- TPL-225 — `claim-check --force-expire` two-part operator gate
  (`COA_OPERATOR=1` + explicit flag). R4's `--teardown-stale
  --execute` reuses this exact model.
