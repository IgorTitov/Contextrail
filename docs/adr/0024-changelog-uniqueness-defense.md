<!-- @HEADER
@version 0.7.94 | 2026-05-05
@purpose ADR: multi-layer changelog version-uniqueness defense (C5, TPL-286).
@sidecar 0024-changelog-uniqueness-defense.md.header.md
@layer docs | @hex _none_ | @ctx changelog
@public true
@edit careful -->

# ADR-0024 — Multi-Layer Changelog Version-Uniqueness Defense

**Status:** Accepted  
**Date:** 2026-05-05  
**Slice:** TPL-286  
**Discovered via:** Cockpit AIC-DEV-140 (`81301ae1`)

---

## Context

Cockpit incident AIC-DEV-140 produced two `## [0.9.36]` sections with different
timestamps in CHANGELOG.md. Root cause: `finalizeChangelog()` in Cockpit's
`changelog-release.mjs` guarded against duplicates by checking for the full
timestamped heading `## [${version}] - ${date}`. When the pre-commit hook called
`changelog-release.mjs --version=0.9.36` a second time (with a different timestamp),
the guard string did not match and a second section was inserted.

Template's `changelog-release.mjs` already uses a version-only guard
(`text.includes(\`## [${version}]\`)`) which correctly handles this case. However,
a single idempotency guard in one script is insufficient defense-in-depth:

- An operator can manually edit CHANGELOG.md and create a duplicate.
- An external tool can write a second section outside of `changelog-release.mjs`.
- A coa-merge crash-and-retry with corrupted state can invoke `changelog-release.mjs`
  after a prior partial completion that left the file inconsistent.
- A regression in the guard logic in any future refactor would bypass layer 1.

No standalone check existed to detect or refuse duplicates at pre-commit, pre-push,
or coa-merge entry points.

## Decision

Implement five independent layers of defense forming rule **C5 — Changelog version
uniqueness invariant**:

| Layer | Where | Mechanism | Evasion scenario caught |
|-------|-------|-----------|------------------------|
| 1 | `changelog-release.mjs` CLI | Version-only idempotency guard (already present; confirmed + regression test added) | Double invocation with same --version |
| 2 | `changelog-sync.mjs --check-uniqueness` | Parse all `## [<version>]` headings; fail if any version appears more than once | Manual edit, external tool write |
| 3 | Pre-commit Phase 7 | Wire layer 2 into `run_sequential` after `changelog-sync.mjs` | Any uncommitted state with duplicate before commit |
| 4 | Pre-push hook | Hard-fail block before push if layer 2 exits non-zero | Duplicate lands in committed state; blocked at push |
| 5 | `coa-merge.mjs` step 0 M2 pre-flight | `detectChangelogDuplicates()` called before any ceremony; refuses with recovery hint | Crash-and-retry with duplicate in working tree |
| 6 | `tests/integration/changelog-uniqueness.test.mjs` | Reads live CHANGELOG.md; asserts version uniqueness invariant | Regression in any of layers 1-5 |

### Layer 1 — `changelog-release.mjs` guard (confirmed + regression test)

The existing guard at line 245 (`text.includes(\`## [${version}]\`)`) correctly
uses version-only matching. A regression test (`TPL-286` suite in
`tests/unit/changelog-release.test.mjs`) verifies that two calls with identical
`--version` but different timestamps produce only one section.

### Layer 2 — `changelog-sync.mjs --check-uniqueness`

New `--check-uniqueness` flag added to `scripts/checks/changelog-sync.mjs`.
Read-only: never mutates CHANGELOG.md. Exports `findDuplicateVersion()` and
`parseVersionHeadings()` as pure functions for testability.

Error message format when a duplicate is found:
```
[changelog-sync] FAIL: duplicate version section detected
  ## [0.9.36] appears 2 times (line 51, line 67)
  Recovery:
    1. Remove the older duplicate section manually
    2. Or run: git restore CHANGELOG.md
       then re-release once via: node scripts/checks/changelog-release.mjs --version=<N>
```

### Layer 3 — Pre-commit Phase 7

`changelog-sync.mjs --check-uniqueness` is added to the `run_sequential` block
in Phase 7 (heavy gates, non-skippable). This is the primary enforcement point
for working-tree state before every commit.

### Layer 4 — Pre-push hard-fail

A new block in `.githooks/pre-push` runs `changelog-sync.mjs --check-uniqueness`
before any ref is pushed to a real remote (local file-path remotes are exempt,
matching the existing pattern for other pre-push checks). This is the last gate
before a corrupted CHANGELOG reaches the remote.

### Layer 5 — `coa-merge.mjs` step 0 M2 extension

`detectChangelogDuplicates()` (exported from `coa-merge.mjs`) is called
immediately after the half-baked detection block at step 0. This adds a fourth
vector to M2's detection surface: the original half-baked check handles
VERSION-ahead-of-HEAD; the new check handles duplicate section headings regardless
of VERSION state.

Recovery hint emitted:
```
CHANGELOG.md has duplicate version sections (C5 invariant violated):
  ## [0.9.36] appears 2 times (line 51, line 67)

Recovery options:
  1. Remove the older duplicate section from CHANGELOG.md manually
  2. Or revert: git restore CHANGELOG.md
     Then re-release once via: node scripts/checks/changelog-release.mjs --version=<N>
```

### Layer 6 — Meta-test invariant

`tests/integration/changelog-uniqueness.test.mjs` reads the live CHANGELOG.md
on every test run and asserts version uniqueness. This is the always-on regression
net: if any of layers 1-5 silently regress, this test surfaces the corruption.

## Consequences

**Positive:**
- Any corruption of CHANGELOG.md that creates duplicate versioned sections is
  caught at the earliest possible gate (pre-commit) and is blocked at push.
- The meta-test provides a permanent regression net that survives refactors.
- Recovery instructions are copy-pasteable and deterministic.

**Negative:**
- Pre-commit Phase 7 adds one sequential step (fast: parses CHANGELOG.md once).
- Pre-push adds one check (exits immediately on clean changelogs).

**Scope exclusions:**
- Auto-merge of duplicate sections is explicitly NOT implemented. The C5 invariant
  refuses and provides recovery hints; the operator decides which section to keep.
- Signing or cryptographic verification of CHANGELOG is a future extension.
- Backport to Cockpit and Zvenix is tracked as separate Wave H slices.

## Rule classification

**C5 — Changelog version uniqueness invariant**  
Category: A (Enforced)  
Docs: this ADR  
Registry: `docs/rules-registry.md` §C5
