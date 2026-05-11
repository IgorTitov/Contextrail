<!-- @HEADER
@version 0.8.15 | 2026-05-11
@purpose Document 0052-r1-claims-write-detection for this repository.
@sidecar 0052-r1-claims-write-detection.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0052: R1.3 — Static detection of live .claims/ path construction in tests

- **Status:** Accepted
- **Date:** 2026-05-11
- **Slice:** TPL-336
- **Supersedes:** Nothing. Extends ADR-0015 (R1) with a third sub-rule.

## Context

The ZVX-DEV-1000 incident revealed a second-order vulnerability in the test isolation model:

1. `autoPickNextSliceId` in `coa-worktree.mjs` scans the live `.claims/` directory to find the highest active slice ID, then increments it.
2. If orphaned claim files (status `active`, from incomplete cleanup) accumulate in `.claims/`, `autoPickNextSliceId` computes a vastly inflated next ID. In the ZVX-DEV-1000 case: `max(git-log-max=164, claims-max=999) + 1 = 1000`.
3. The root cause was a `coa-worktree --create` that was aborted mid-way, leaving a ZVX-DEV-999 claim file active. But the same class of pollution can be produced by tests that write to live `.claims/` if their `after()` cleanup fails.

R1 (ADR-0015) already prohibits tests from writing to live git repositories or `.git/` directories. The gap: R1 had no rule covering the live `.claims/` directory, which is not a git construct but has the same "if polluted, future operations misbehave" property.

TPL-335 (ADR-0051) added a runtime anomaly guard on `autoPickNextSliceId`. This ADR adds the complementary static detection layer.

## Decision

Extend R1 with sub-rule **R1.3 (`claims-dir-leak`)**: test files must not construct paths pointing to the live repo's `.claims/` directory.

Specifically, `test-isolation-check.mjs` now scans for two canonical patterns:

**Pattern 1 — URL constructor form:**
```js
new URL('.../.claims', import.meta.url)
```
This is the standard ESM idiom for building a file-relative path to `.claims/`. A test that uses this pattern can write claim files into the live repo.

**Pattern 2 — path.join form:**
```js
join(ROOT, '.claims')
join(__dirname, '..', '.claims')
```
Any `join()` call whose argument list includes the string literal `'.claims'` and whose context is not obviously `tmpdir`-derived.

**Tmpdir exception:** Either pattern on a line that contains `tmpdir`, `RUNNER_TEMP`, or `mkdtemp` is exempt — that indicates the `.claims/` path is inside a temporary test repo, not the live repo.

## Exception path

Files that intentionally access live `.claims/` (e.g. integration tests proving the `claim-check --acquire` mechanism) must:

1. Add a whitelist annotation in the **first 10 lines**:
   ```js
   // @test-isolation: live-repo-allowed | reason: <≥60 chars explaining why>
   ```
2. Add the file path to `scripts/checks/test-isolation-allowlist.json` `files[]`.

Both halves must be present. One without the other produces a `whitelist-incomplete` violation.

### Initial whitelist (TPL-336)

These two files are formally whitelisted because they test the C4 slice-ID lock invariant by necessarily exercising `claim-check --acquire` against the live `.claims/`:

- `tests/integration/coa-worktree-slice-id-lock.test.mjs` — uses `CWALOCK-T1-<timestamp>` dynamic IDs, cleans up in `after()`
- `tests/integration/coa-worktree-slice-id-race.test.mjs` — uses `C4RACE-<timestamp>` dynamic IDs, cleans up in `after()`

## Defense-in-depth: runtime meta-test

Static detection catches the code path. The runtime companion `tests/integration/no-test-fixture-leaks.test.mjs` provides a second layer: it captures a `.claims/` baseline at module-load time and at test-body time flags any new files matching known fixture agent names or slice-ID prefixes (CWALOCK-, C4LOCK-, C4RACE-, TST-, FST-, FIXTURE-). This catches the cleanup-failure scenario where `after()` does not run.

## Evasion vectors and defenses

| Vector | Defense |
|--------|---------|
| Rename variable to avoid `.claims` literal — `const dir = getClaimsDir(); join(dir, 'x.json')` | Pattern 2 only catches the direct join form. Variable indirection is NOT caught by static scan. Runtime meta-test is the backstop for this case. |
| Build path in a comment | `stripCommentsAndStrings` strips comments before Pattern 1/2 scan (the URL pattern is scanned on original source but uses a stripped-position guard). |
| Use `path.resolve` instead of `join` | Pattern 2 only matches `join(`. `resolve()` calls with `.claims` would be missed. Runtime meta-test is the backstop. |
| Hardcode an absolute path string | Pattern 1/2 require `.claims` as a substring of a constructed path. A raw hardcoded string (`'/abs/path/.claims'`) is not caught. Runtime meta-test is backstop. |

The static check is intentionally heuristic — the runtime meta-test closes the remaining evasion surface for the specific high-value case (fixture cleanup failure).

## Consequences

- Positive: the ZVX-DEV-1000 pollution class is closed at both the static (pre-commit) and runtime (test suite) layers.
- Positive: the exception path is visible and audited (allowlist file, whitelist annotation, CHANGELOG entry).
- Neutral: two existing integration tests gain a whitelist annotation. Their actual behavior is unchanged.
- Neutral: the allowlist test assertion changes from `files.length === 0` to `files.length === 2`. Growth beyond 2 requires an explicit code change and CHANGELOG entry — the audit trail is preserved.
- Backport needed: Zvenix has the same two integration test files (`coa-worktree-slice-id-lock.test.mjs`, `coa-worktree-slice-id-race.test.mjs`) using `C4LOCK-` and `C4RACE-` prefixes. The same whitelist treatment should be applied when `test-isolation-check.mjs` is backported to Zvenix.

## Related

- ADR-0015: R1 base rule — test isolation enforcement
- ADR-0020: Slice-ID uniqueness invariant (C4)
- ADR-0051: TPL-335 anomaly guard on `autoPickNextSliceId`
- `docs/rules-registry.md`: R1 narrative entry (update with R1.3 sub-rule)
