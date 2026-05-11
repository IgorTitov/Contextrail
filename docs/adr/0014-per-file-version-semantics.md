<!-- @HEADER
@version 0.7.62 | 2026-05-03
@purpose Document 0014-per-file-version-semantics for this repository.
@sidecar 0014-per-file-version-semantics.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0014 — Per-file `@version` semantics: last-changed, not last-released

## Status

Accepted (transitioned from Proposed at v0.7.36 via TPL-233 — see "Status transition" below).

## Context

Today's behavior: every atomic commit bumps `VERSION` and runs the
pre-commit hook's Phase 5 fix/sync block. That phase invokes
`scripts/checks/header-fix.mjs` (currently `--since=HEAD` after TPL-231,
historically `--all`), which re-stamps `@version <new VERSION> | <today>`
into the inline header of every meaningful file with a header. The
mechanical effect:

- A file untouched for thirty commits still carries `@version` equal to
  the current `VERSION`. The header lies about when the file last
  changed.
- The cross-cutting fallback path (`--all`, before TPL-231) physically
  rewrote on the order of 1968 files per template commit. Even after
  TPL-231 narrowed the scope to "files differing from HEAD", the field
  still treats `@version` as a copy of global `VERSION` rather than as a
  per-file signal.

This conflates three artefacts that have different audiences and decay
profiles:

| Artefact | What it tracks | Audience |
| --- | --- | --- |
| `CHANGELOG.md` | Per-commit / per-version diff of the whole repo | Operators reviewing what changed |
| Release Notes (separate artefact, TBD) | Per-release feature summary | End-users / downstream consumers |
| File `@version` header | When **this file** was last meaningfully modified | Operators reading the file inline |

Treating the third as a redundant mirror of `VERSION` discards the only
signal the inline header was supposed to carry and pays for it with
disk wear, working-tree noise, and a header that rots into a lie the
moment a different file is touched. Field-finding 019 in
`docs/analysis/field-findings-log.md` (2026-04-28, gitignored on disk)
is the operational concern that surfaced this — disk wear from
`--all` fallback was the visible symptom; the underlying defect is
that the field's contract was wrong.

## Decision

`@version` in slim inline headers (ADR-0009) and sparse sidecars
shifts to **last-meaningfully-changed-at-VERSION** semantics. A file's
`@version` updates only when the commit that lands actually modifies
the file's content (excluding header-only restamps).

Mechanical implementation lives in **TPL-233** (post-commit
content-aware stamping plus a one-shot backfill). This ADR is the
semantic decision; TPL-233 is its implementation. The `@version` field
itself is not removed — only its meaning is corrected.

The companion `@version` line in `*.header.md` sparse sidecars tracks
the same answer (last-content-change of the **parent file**), not the
last edit of the sidecar's narrative.

## Consequences

### Positive

- **The field becomes a truthful diagnostic.** "This file was last
  touched at v0.5.3" is information an operator can act on. "This file
  carries the current VERSION" is information they already have from
  `cat VERSION`.
- **Disk wear drops by orders of magnitude per commit.** Roughly 1968
  files re-stamped → 5–50 files actually touched in a typical slice.
  The visible symptom from field-finding 019 disappears.
- **Working-tree noise post-commit shrinks to actual changes.**
  Operators stop scanning past hundreds of restamps to find the real
  diff. Reviewers see only the files the commit was about.
- **Merge-conflict surface shrinks.** Two parallel sessions whose
  changes touch disjoint files no longer collide on `@version` lines
  in the header zone.
- **`CHANGELOG.md` regains exclusive ownership of "what shipped at
  VERSION X".** `@version` stops being a noisy second copy of the
  same answer.

### Negative

- **One-shot migration required.** Existing headers carry the old
  semantics across the whole tree. The migration must walk every file
  with an inline header, resolve its last-content-change commit via
  `git log -1 --format=%H -- <file>`, resolve the `VERSION` at that
  commit via `git show <hash>:VERSION`, and write that VERSION as
  `@version`. This is one commit per repo, ideally bundled with the
  TPL-233 implementation so the new behavior and the migrated state
  ship together.
- **Post-commit hook re-enabled for stamping.** This is a narrow
  exception to the existing CLAUDE.md rule that `post-commit` is
  intentionally disabled. The exception is scoped: the hook does
  **only** content-change-aware `@version` stamping plus the
  idempotent-write guard from TPL-232; nothing else. The post-commit
  policy work in TPL-226 should treat this exception as a known
  carve-out rather than a re-opening of the door. See "Implementation
  seam" for the precise contract.
- **Mixed semantics across the COA ecosystem during rollout.**
  Cockpit and Zvenix inherit this only when they backport. Until they
  do, their `@version` stamps continue to mirror their VERSION.
  Acceptable because `@version` is consumed by humans, not by
  cross-repo tooling — readers in either world get a coherent
  answer for the repo they are looking at.
- **Edge cases in the backfill script.** Shallow clones, missing
  tags, files added then deleted then re-added, and files renamed via
  `git mv` may not resolve cleanly to a last-content-change VERSION.
  See "Migration" for the documented fallback behavior.
- **Local short-circuits are weaker.** "What VERSION is this codebase
  on?" is no longer answerable by reading any file's inline header.
  Operators must read `VERSION`. Acceptable — that file already
  exists for that purpose, and the deceptively-uniform `@version`
  numbers are exactly what makes the existing answer feel
  authoritative when it isn't.

## Alternatives considered

1. **Status quo — eager stamp every commit.** Rejected. Pays the disk
   and noise cost without informational gain. Misleads any operator
   who reads `@version` expecting per-file truth. The field becomes
   tautological with `VERSION` and earns no review surface in PRs.
2. **Gradual migration — no backfill, only stamp on next change.**
   Rejected. Leaves mixed semantics across the tree for months. The
   new behavior is unobservable until a file changes, which defeats
   the diagnostic intent of the field. Files that never change
   (stable, well-named, low-traffic) keep their misleading old stamp
   indefinitely.
3. **Manual stamping — no automation, agents do it themselves.**
   Rejected. Drift-inducing. Forgetful. Downstream consumers go
   inconsistent. The whole point of `@version` was that it survives
   without ceremony.
4. **Remove `@version` entirely — the information is in `git log`.**
   Considered. It is true that `git log -1 -- <file>` can answer the
   same question. But the field is read inline while reading code,
   without leaving the editor. That cheap, in-context answer has
   value. The defect is the field's contract, not its existence.
   Keep the field; fix its meaning.

## Migration

One-shot backfill commit per repository, bundled with the TPL-233
implementation:

```
node scripts/checks/header-backfill.mjs
git add -A   # one bundled commit, ceremonially exempt from "name files"
git commit -m "chore(headers): backfill @version to last-changed semantics (TPL-233)"
```

The script (TPL-233 deliverable) walks every file with an inline
header. For each file:

1. Run `git log -1 --format=%H -- <file>`. If the result is non-empty,
   that hash is the last commit that changed the file's content.
2. Run `git show <hash>:VERSION` to read the VERSION as it stood at
   that commit. Write that value as `@version` in the file's header.
3. If `git log` returns empty (file added in the working tree but
   never committed) or `git show` fails (VERSION did not exist at the
   resolved hash, e.g. the file predates the VERSION file itself),
   fall back to the **current** VERSION. Log a per-file warning so
   the operator can spot-check.
4. Files renamed via `git mv` are followed via `git log --follow` so
   the rename is not interpreted as a deletion + recreation.

The post-commit hook from TPL-233 takes over from there: every
subsequent commit stamps only the files whose content actually
changed in `HEAD`.

Backfill does not need to be perfect on the first run — the cost of
falling back to current VERSION on edge cases is one stale-but-honest
restamp on the next real change, which is exactly the steady-state
behavior. Better to accept a small fallback rate than to block the
migration on every shallow-clone case.

The full set of edge cases the backfill must handle is intentionally
deferred to TPL-233's design notes, where they can be enumerated
against actual repo history rather than guessed at here. This ADR
commits to the **policy** that the backfill exists, fails soft, and
logs warnings — not to the precise algorithm for each git
pathological case.

## Implementation seam

The post-commit hook reads `HEAD`, lists the files modified in that
commit (`git diff-tree --no-commit-id --name-only -r HEAD`), and for
each file with an inline header:

1. Read the current `@version` value.
2. Compare against the current `VERSION`.
3. If equal (the file already shows the just-bumped version), do
   nothing.
4. If different, write the current `VERSION` and date into the
   header — and **only** those two values, leaving every other field
   untouched.

The idempotent-write guard from TPL-232 (`writeFile` skips when the
new bytes equal the on-disk bytes) means a no-op restamp does not
produce a working-tree dirty mark. Combined with the diff-tree
filter, the hook touches **only** files whose content actually
changed in the just-landed commit.

The pre-commit Phase 5 `header-fix --since=HEAD` continues to run for
its existing sync purposes — adding headers to brand-new files,
schema migrations, fixing structurally-broken sidecars. It must
**not** bump `@version` on existing files when the only difference
would be the version stamp. That responsibility moves to
post-commit. Concretely, `header-fix` in pre-commit context should
treat `@version` as load-bearing and preserve whatever value the file
already holds, applying only structural fixes.

`*.header.md` sparse sidecars follow the same rule. The sidecar's
`@version` reflects the parent file's last-content-change, not the
sidecar's own last edit. When an operator changes only the sidecar's
narrative (rare — the markdown body is decorative), the post-commit
hook stamps the sidecar with the current VERSION and leaves the
parent untouched. When the parent changes, both the parent's inline
header and the sidecar stamp together.

## Status transition

Proposed → Accepted after operator review of:

- the one-shot backfill semantics (especially the fallback-to-current
  VERSION behavior on shallow clones / missing tags),
- the post-commit policy carve-out's interaction with TPL-226's
  parallel post-commit work,
- the explicit confirmation that `*.header.md` sidecar `@version` is
  parent-tracking, not self-tracking.

A reasonable review window is one full multi-tier validation cycle
(end-to-end run on a downstream consumer plus the template's own
ceremony) — concretely, after the first round of TPL-225 backports
to Cockpit and Zvenix have settled. That keeps the migration
sequence ordered: TPL-231 (`--all` removal) and TPL-232 (idempotent
write guard) land first, then TPL-233 (backfill + post-commit) lands
on top of a quiet headers tree, then this ADR transitions to
Accepted.

### Validation footer (v0.7.36)

TPL-233 landed as two atomic commits on top of v0.7.34:

- **v0.7.35 — `chore(headers): backfill @version to last-changed
  semantics (TPL-233)`** — one-shot migration walking 1250
  header-bearing files; 1236 drifted from eager-stamp values back to
  honest last-changed values, 14 already correct, 1 fell back to the
  current VERSION (no resolvable history). Bundled with the new
  `header-backfill.mjs` script, the `header-fix --lazy-stamp` /
  `--files-from=<path|->` flags, and the pre-commit Phase 5 switch
  to `--lazy-stamp`. The post-commit hook stayed inert in this
  commit so the migration converged to honest values before the
  new policy kicked in.
- **v0.7.36 — `feat(header-fix): lazy-stamp + post-commit narrow
  exception (TPL-233)`** — activates `.githooks/post-commit` to
  feed `git diff-tree --no-commit-id --name-only -r HEAD` into
  `header-fix --files-from=- --json` per the algorithm above. Adds
  unit + integration coverage (`tests/unit/header-fix.test.mjs`,
  `tests/unit/header-backfill.test.mjs`,
  `tests/integration/parallel-sessions.test.mjs`). CLAUDE.md and
  `.claude/rules/development.md` document the carve-out. This ADR
  transitions Proposed → Accepted with the slice's own commit
  ceremony as the validation cycle.

Open questions deferred to follow-up work rather than blocking the
transition:

- The post-commit policy carve-out's interaction with TPL-226's
  parallel post-commit policy work — TPL-226 must treat this as a
  documented prior carve-out, not a fresh re-opening of the door.
- Steady-state working-tree noise: post-commit's `@version` stamp
  lands as a working-tree modification on the files HEAD's commit
  changed (HEAD itself stays clean — the stamp is in the operator's
  working copy, not amended into the commit). That dirt is absorbed
  by the next real commit and is the cost of the new contract; it
  is a known and accepted artefact.
- Downstream backports (Cockpit, Zvenix) tracked separately. Until
  they backport, their `@version` continues to mirror their VERSION;
  this ADR commits to per-repo coherence, not cross-repo uniformity.

## Revision (TPL-246) — 2026-05-03

The original mechanism (TPL-233) used pre-commit `--lazy-stamp` (preserve old
`@version`) plus a post-commit narrow exception (write new `@version` after the
commit landed). This created persistent working-tree residue: the post-commit
stamp overwrote files whose blobs already lived in HEAD, so every commit left a
`git status` noise line for each file touched — and every "cleanup" commit
recreated the same residue (cascade non-convergence).

**Revised mechanism.** Pre-commit Phase 5 now uses `--use-current-version`
instead of `--lazy-stamp`. The flag reads the VERSION file (already bumped by
the ceremony at Phase 5 time) and stamps `@version` preemptively on slim-header
files in the `--since=HEAD` scope. `header-fix` then calls `git add` on the
stamped files so they land in the same commit blob. Post-commit hook is fully
disabled.

Invariants preserved:

- `@version` updates only when the commit modifies the file's content —
  the `--since=HEAD` filter still gates which files are walked (unchanged
  files are excluded from the diff and never touched).
- Stamping remains narrow (only the changed-file set, never the whole repo).
- ADR-0009 slim-header schema is unchanged.

Working tree now converges to a clean state after every commit. Operators can
rely on `git status --porcelain` showing empty after a completed ceremony — any
non-empty output represents genuine WIP, not header-stamp residue.

The `--lazy-stamp` flag remains available and its behaviour is unchanged for
other callers. `--use-current-version` overrides `--lazy-stamp` when both are
present, giving callers an explicit opt-in to preemptive stamping.

Integration test: `tests/integration/per-file-version-semantics.test.mjs`.

## Revision (TPL-260) — 2026-05-03

Post-commit hook gains a **narrow second exception** beyond the TPL-246 no-op baseline:
a fast, read-only check that warns (does not block, does not mutate) when HEAD's
commit bumped VERSION but `.backups/` lacks the matching `.txt`/`.zip` snapshot.

**Why post-commit?** The snapshot for a new VERSION can only be produced *after*
the commit lands (coa-merge step 9b calls mergezip *after* git commit succeeds).
A pre-commit blocker is structurally wrong for this check. The post-commit hook
runs in the correct window — immediately after every commit — and emits the warning
before the operator moves on to the next task.

**Root cause this closes.** Investigation (TPL-260 Step 2) found that 59 of 84
versioned CHANGELOG headings lacked `.backups/` snapshots. The proximate cause was
operators bypassing coa-merge with `git commit` directly (autostash workaround
active before TPL-250, or other ceremony variations). When coa-merge is bypassed,
step 9b never fires. The existing AIC-087 / R8.1 check in the pre-push hook
catches gaps only at push time — which can be minutes to days after the commit.

**Revised post-commit contract:**

- **Read-only** — the hook never writes files, never calls `git add`, never mutates
  the index. This is the key invariant that distinguishes it from the TPL-233 carve-out
  (which did write `@version` stamps and was superseded by TPL-246).
- **Non-blocking** — exits 0 always; warning is advisory.
- **Fast** — node startup + `git show` × 2 + `readdir` typically under 200 ms.
- **Single responsibility** — the only action is: emit a `console.log` warning when
  VERSION bumped but snapshot absent. Nothing else.

**Implementation**: `scripts/checks/post-commit-snapshot-warn.mjs` contains:
- `snapshotWarnCheck(opts)` — pure helper (no I/O), exported from
  `snapshot-coverage-check.mjs`
- `collectWarnState(repoRoot)` — reads git + filesystem
- `runPostCommitWarn(repoRoot)` — combines the above and prints warning

The `.githooks/post-commit` hook invokes this script via `node` and ignores errors
(`|| true`) so a misconfigured node environment never blocks a commit.

Tests: `tests/unit/post-commit-snapshot-warn.test.mjs` (pure-helper cases),
`tests/integration/post-commit-snapshot-warn.test.mjs` (fixture-backed git cases).

CLAUDE.md updated: "post-commit fully disabled" replaced by "post-commit narrow
warning-only, no mutation; second exception is TPL-260 snapshot gap detection".

## References

- ADR 0009 — Sidecar-first headers (the format `@version` lives in)
- ADR 0006 — Context-Optimized Architecture (the constraint that
  motivated header metadata at all)
- TPL-231 — Replace Phase 5 `header-fix --all` fallback with
  `--since=HEAD`
- TPL-232 — `header-fix` content-idempotent write guard
- TPL-233 — Per-file `@version` post-commit stamping plus one-shot
  backfill (the implementation slice for this ADR)
- TPL-246 — Eliminate post-commit `@version` cascade — preemptive
  pre-commit stamping with `--use-current-version`
- TPL-260 — Post-commit snapshot gap warning (this revision's implementation)
- TPL-226 — Post-commit policy review (now resolved: hook narrow warning-only
  per TPL-260, no mutation)
- `docs/analysis/field-findings-log.md` Entry 019 — disk-wear concern
  from Zvenix that surfaced the underlying semantic defect
