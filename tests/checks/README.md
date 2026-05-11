<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Folder guide for meta-tests that prove the deterministic checks under scripts/checks/ behave as advertised.
@sidecar README.md.header.md
@layer tests | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# tests/checks

Meta-tests for the deterministic checks that run from `.githooks/pre-commit`
and CI. They prove the checks themselves do what they claim — distinct
from `tests/unit/`, which proves the logic each check is built on.

## Contents

- `test-isolation-check.test.mjs` — pins detection of every fixture
  under `fixtures/test-isolation/`, asserts the allowlist starts
  empty, and verifies the runtime guard / safeGit invariants the
  static check depends on (R1 / ADR-0015).
- `fixtures/test-isolation/` — 17 small files, each demonstrating
  a single bad-or-good pattern. The static check's `--self-test`
  mode runs them through `detect()` and asserts the expected verdict.

## Why a separate folder

These tests deliberately couple to specific check-script source code.
Putting them under `tests/unit/` would suggest they exercise generic
domain logic; they don't. They exist to keep the deterministic
checks honest about what they detect.

## Related

- `scripts/checks/test-isolation-check.mjs`
- `tests/_setup/safe-git.mjs`
- `tests/_setup/no-live-git.mjs`
- `docs/adr/0015-test-isolation-enforcement.md`
