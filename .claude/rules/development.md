<!-- @HEADER
@version 0.8.3 | 2026-05-10
@purpose Capture short repository-local development rules for trunk-based delivery, safe seams, proof-first work, temporary abstraction coordination, and bounded UI hook usage.
@sidecar development.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Development rules

- Start behavior changes by finding or creating a safe seam. For trivial one-line fixes where old and new behavior cannot coexist, a direct commit is acceptable — but always file a claim first to prevent parallel conflicts.
- Keep new behavior disabled by default behind that seam until the relevant proof is green.
- TDD is the default; bugfixes require a failing regression test first.
- “Atomic” means the smallest independently reviewable user-meaningful slice, not one mechanical sub-step.
- One atomic commit may include seam, tests, implementation, and docs when that is the smallest safe slice.
- Temporary seams should document scope, owner, active path, and cleanup trigger in the nearest canonical place.
- If another actor owns a temporary seam, avoid broad edits in that isolated area unless necessary, and update the note before touching it.
- Deep-read the files you will actually change and their direct collaborators.
- For untouched areas, use headers, public APIs, tests, and nearby docs before opening internals.
- For visible UI work, pull stable `data-testid`, reusable DOM `id`, and derived selectors from a bounded registry instead of hardcoding the same hooks independently in templates, JS, and tests. Follow the pattern in `apps/starter/ui-selectors.mjs`.


## Staging and parallel-session safety

- Never `git add -u`, `git add .`, or `git add :/` — always name specific files. These commands capture WIP changes from other parallel sessions.
- Always `git pull --rebase` before bumping VERSION, CHANGELOG, or package.json.
- Scope repo-wide fix scripts to your active directory: `header-fix --scope=<dir>`, `readme-fix --scope=<dir>`, `prettier --write <dir>`, `eslint --fix <dir>`. Running them repo-wide regenerates files in other sessions' areas.
- `header-fix --all` is for explicit global refactors only (e.g. an ADR change touching every file); pre-commit and routine work use `--since=HEAD` (or `--changed`) so only files differing from HEAD are re-stamped.
- Pre-commit Phase 5 runs `header-fix --since=HEAD --use-current-version` (ADR-0014 Revision, TPL-246). This reads the VERSION already bumped by the ceremony and stamps `@version` preemptively on slim-header files in the changed set, then git-adds those files so the stamp lands in the commit blob — working tree converges to HEAD after every commit with no residue.
- `.githooks/post-commit` is **narrow warning-only, no mutation** (TPL-246 + TPL-260). The `@version` stamping carve-out (TPL-233) was superseded by pre-commit preemptive stamping (TPL-246). TPL-260 adds one read-only exception: warn when HEAD bumped VERSION but `.backups/` lacks the matching snapshot. The hook never writes files or touches the index. Adding a *mutating* post-commit behavior requires a new ADR.
- Run `node scripts/coa-worktree.mjs --audit` periodically (R4 / ADR-0016). Tear down worktrees only when the verdict is `clean-merged`. For `stale-merged-with-stamp-residue`, run `--refresh` first to discard stamp-only `@version` residue (the classifier preserves anything ambiguous). `--teardown-stale --execute` requires `COA_OPERATOR=1` plus a prior `--dry-run` marker — same operator gate as `claim-check --force-expire`.

## Versioning and CHANGELOG

Every atomic commit bumps VERSION and adds a CHANGELOG section. No exceptions.

### @version in file headers — DO NOT touch manually

**Never write `@version` in file headers yourself.** Leave the existing value as-is while you work. The pre-commit hook stamps the correct version automatically from the VERSION file at commit time.

If you manually write a version number in headers, it WILL be wrong in parallel sessions (another agent may commit first with that number). This is the #1 cause of version drift.

### Commit ceremony — use coa-merge

**Preferred:** Use `coa-merge.mjs` — it enforces all steps automatically:

```bash
git add <your slice files>
node scripts/coa-merge.mjs --message="feat(module): description" --agent=<your-role>
```

`--agent=<role>` is required when running from a `tx-*` transport worktree (TPL-304 / C6 / ADR-0034). Pass the same role you set in `COA_AGENT`, or the `coa-worktree --create` session name. Examples: `--agent=feature-implementer`, `--agent=frontend-specialist`, `--agent=tx-TPL-304`. Without `--agent` (and without `COA_AGENT` env), coa-merge refuses on tx-branches with `agent-unknown`.

coa-merge handles: pull --rebase, claim enforcement, VERSION bump, CHANGELOG release, commit, claim auto-complete. If any step fails, it stops with guidance.

**Manual fallback** (when coa-merge is not available):

1. **Finish code + tests.** Do not touch VERSION, package.json, or CHANGELOG yet.
2. **`git pull --rebase`** to get the latest trunk.
3. **Lock:** `claim-check --acquire` on VERSION + CHANGELOG.md + package.json.
4. **Read** current VERSION at HEAD → N.
5. **Bump** N+1 → write to VERSION and package.json `"version"`.
6. **CHANGELOG:** run `node scripts/checks/changelog-release.mjs --version=N+1` to move [Unreleased] into a timestamped section. If [Unreleased] is empty, the script skips — do not create empty version sections.
7. **`git add`** your slice files + VERSION + package.json + CHANGELOG.md.
8. **`git commit`** immediately.
9. **Unlock:** claim auto-completes on commit.

The window between step 4 (read VERSION) and step 8 (commit) must be **seconds**. No other work between these steps.

### Commit message format

The `commit-msg` hook (`scripts/checks/commit-msg-check.mjs`) enforces Conventional Commits on every commit, and the constraints aren't obvious until you hit them.

- **Header (subject) ≤ 100 characters.** This is the fail-loud limit. If you need more room, move detail into the body — the body has no length cap.
- **Header shape:** `<type>(<scope>)?: <summary>` — `type(scope): summary` or `type: summary`. Scope is optional but is project convention for this repo (e.g. `fix(claim-check):`, `feat(coa-merge):`).
- **Allowed types:** `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`, `build`, `ci`, `style`. No others.
- **Header must not end with a period.**
- **Body** (lines after the blank line below the header): wrap at ≤ 72 chars per line.
- **Slice traceability:** at least one line in the message body must reference the work item ID, e.g. `(TPL-198)` at the end of the header, or `Refs TPL-198` in the body. The pattern `[A-Z][A-Z0-9]+-\d{3,}` is the matcher.
- **Auto-generated shapes are skipped:** `Merge`, `Revert`, `Release`, `fixup!`, `squash!` prefixes bypass validation.

Common failure: a long descriptive subject like `feat(claim-check): main() resolves DEFAULT_PROTECTED_PATHS once and threads it through every detection call (TPL-199)` is 117 chars and gets rejected. Shorten to e.g. `feat(claim-check): thread DEFAULT_PROTECTED_PATHS through detection (TPL-199)` (78 chars) and put the rest in the body.

### What NOT to do

- **Do not pre-pick a version** ("I'll be 0.11.82") — until a commit is on trunk it doesn't exist.
- **Do not bump at the start of a slice** — bump at the end, right before commit.
- **Do not write `@version X.Y.Z` in headers** — header-fix does this automatically at commit time.
- **Do not skip the pull --rebase step** — you'll collide with another session's version.
- **Do not create empty CHANGELOG sections** — if [Unreleased] has no real content, do not bump VERSION. An empty `## [X.Y.Z]` heading is a defect.
- **Do not write "snapshot produced" as a changelog entry** — snapshots/backups are routine operational output of every release, not product changes.
- **Do not let VERSION run ahead of CHANGELOG** — VERSION must equal the latest versioned CHANGELOG section. Drift means a bump happened without content.
- **Use `--key=value` syntax** when passing args between scripts (not `--key value`) — simple parsers lose the value with space-separated args.

## COA_SKIP_GATES by slice type

Phases 0, 1.0, 2.5, 2.6, 2.7 are non-skippable in all Template
ceremonies regardless of COA_SKIP_GATES. Phase 7 (test-gate) is also
non-skippable in Template — adding 7 to the skip list is silently
ignored.

| Slice type | Template COA_SKIP_GATES | Note |
|---|---|---|
| feature (new code, new tests) | (none) | all phases run |
| doc-only, comments, README | `"1,3,4,6"` | Phase 5 stamps headers; Phase 7 runs (no tests changed) |
| backport, infra-fix, tooling | `"1,3,4,6"` | Phase 7 runs; self-proof required for ceremony-fix slices |
| ceremony-fix (test-gate target) | `"1,3,4,6"` | Phase 7 MUST run — own ceremony is the self-proof |

Cockpit and Zvenix additionally skip Phase 7 (`"1,3,4,6,7"`) because
their test suites have known pre-existing failures. This is per-repo
practice, not a Template pattern.

## User-facing copy

Externalize all user-facing UI copy through a simple i18n/messages layer from day one, even if the current application ships only one locale.
