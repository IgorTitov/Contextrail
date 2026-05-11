<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Folder guide for test-process startup guards and helpers loaded via `node --import` before any test executes.
@sidecar README.md.header.md
@layer tests | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# tests/_setup

Process-startup guards and helpers loaded by the test runner via
`node --import` before any test code executes.

## Contents

- `no-live-git.mjs` — R1 runtime guard (ADR-0015). Refuses to start the
  test process when shell-inherited `GIT_DIR` / `GIT_WORK_TREE` / etc.
  point to real paths. Scrubs those keys, pins
  `GIT_CEILING_DIRECTORIES`, and monkey-patches `child_process` so any
  `git` invocation outside `os.tmpdir()` throws.
- `safe-git.mjs` — `safeGit(cwd, args)` / `safeGitSpawn(cwd, args)`
  helpers. The only sanctioned way for tests to invoke git. The static
  check (`scripts/checks/test-isolation-check.mjs`) flags inline
  `execSync('git ...', { cwd })` as a violation; rewrite to `safeGit`.

## How they wire in

`package.json` test scripts pass
`--import ./tests/_setup/no-live-git.mjs` to `node --test`, so the
guard installs before any test file loads.

## Why this folder is `_setup`

Underscored folders are conventionally not picked up by the test
runner's auto-discovery. These files are infrastructure, not tests —
running them as tests directly is a no-op.

## Related

- `docs/adr/0015-test-isolation-enforcement.md` — full motivation,
  anti-evasion matrix, and the Zvenix incident (TPL-233) that drove
  this rule.
- `scripts/checks/test-isolation-check.mjs` — companion lint-time
  check.
- `tests/checks/test-isolation-check.test.mjs` — meta-test that
  asserts both the static check and the runtime guard hold their
  invariants.
