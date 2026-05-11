<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document 0015-test-isolation-enforcement for this repository.
@sidecar 0015-test-isolation-enforcement.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0015 — Test isolation enforcement (R1)

## Status

Accepted at v0.7.37 via TPL-234.

## Context

On 2026-04-28, the integration test
`tests/integration/parallel-sessions.test.mjs` (backported to Zvenix
from TPL-233) wrote 27–30 sandbox commits — `init`, `edit f1`,
`bump` — directly to live `main` HEAD in the Zvenix repository,
regressing `VERSION` from `0.4.x` back to `0.1.0` and burying real
trunk under junk commits. Recovery required a forced rewrite of trunk.

The test code looked correct. Every fixture used `mkdtempSync(join(tmpdir(), ...))`
to create an isolated sandbox. Every `execSync('git ...')` invocation
passed `cwd: dir` pointing at the sandbox. Yet writes still flowed
into the parent live repo.

Root cause: **environment variable inheritance.** If `GIT_DIR`,
`GIT_WORK_TREE`, or `GIT_INDEX_FILE` were set in the parent shell
(easy to do accidentally — any prior `git --git-dir=... command`
followed by a sub-shell that re-exports the var, or any tool that
treats the project path as a bare repo), git ignores `cwd` entirely.
Those env vars take precedence over working-directory discovery.
Combined with `core.bare = true` set on a parent path, every "isolated"
sandbox commit flowed into the live repo.

This is a class of bug, not a one-off. Reasoning the test author
through "remember to scrub `GIT_DIR`" does not hold up across hundreds
of test files and dozens of contributors. The repository must enforce
the invariant at lint time AND at runtime, with bypass paths
explicitly closed.

## Decision

Adopt R1 — **test isolation enforcement** — implemented as defense in
depth across three layers, with anti-evasion paths explicitly blocked.

### The invariant

> No test in this repository may write to a git repository that is not
> under `os.tmpdir()` (or `process.env.RUNNER_TEMP` for CI), regardless
> of how the test is structured, what env vars are set, or what the
> programmer thought they were doing.

"Cannot" — not "should not".

### Layer 1 — static check (`scripts/checks/test-isolation-check.mjs`)

A token-aware scanner walks every `tests/**/*.{mjs,test.mjs,spec.mjs}`
and `scripts/**/*.{test,spec}.mjs`, follows their relative-import graph
one hop deep, and rejects any of these patterns:

| Pattern | Verdict |
|---------|---------|
| `execSync('git ...')` / `spawn('git', ...)` etc. with no `cwd:` option | `no-cwd` |
| Same with `cwd: process.cwd()`, `cwd: __dirname`, or any non-tmpdir literal | `cwd-non-tmpdir` |
| Same with cwd that is mkdtemp-derived BUT no env override clearing `GIT_DIR` / `GIT_WORK_TREE` | `no-env-override` (the Zvenix bug) |
| `process.chdir(...)` anywhere in test code | `process-chdir` |
| `execSync('gi' + 't ...')` — string-concatenation obfuscation | `dynamic-cmd` |
| `spawn(cmd, [...])` where `cmd` is a suspicious bare identifier (`cmd`, `gitCmd`, `gitBin`, `git`) | `spawn-variable` |
| `await import('child_process')` / `require('child_process')` from a test | `dynamic-import-cp` |
| `fs.writeFileSync('/some/.git/refs/heads/main', ...)` — direct git internal write | `fs-git-write` |
| Per-file annotation `// @test-isolation: live-repo-allowed | reason: <text>` AND file in `test-isolation-allowlist.json` | `whitelisted` (pass) |

The check also self-tests against 17 fixtures under
`tests/checks/fixtures/test-isolation/`. The pre-commit hook runs
`--self-test` BEFORE the real scan, so a tampered detector fails its
own meta-validation before reaching the real codebase.

### Layer 2 — runtime guard (`tests/_setup/no-live-git.mjs`)

Loaded via `node --import ./tests/_setup/no-live-git.mjs` from every
package.json test script. At process start:

1. **Inherited-env trap.** If `GIT_DIR` / `GIT_WORK_TREE` /
   `GIT_INDEX_FILE` / `GIT_OBJECT_DIRECTORY` /
   `GIT_ALTERNATE_OBJECT_DIRECTORIES` are set in the parent
   environment AND point to real paths, refuse to start. Loud message
   tells the operator to `unset GIT_DIR` (POSIX) or
   `Remove-Item Env:GIT_DIR` (Windows).
2. **Env scrub.** Delete those keys from `process.env`. Pin
   `GIT_CEILING_DIRECTORIES` to `tmpdir() + project root` so git's
   upward repo search cannot escape the temp tree.
3. **Monkey-patch.** Wrap CommonJS `child_process` exports
   (`execSync`, `exec`, `spawn`, `spawnSync`, `execFileSync`,
   `execFile`). Any invocation whose command resolves to `git` or
   `git.exe` (literal or path-suffix match) must carry an explicit
   `cwd` option resolving under `tmpdir()` or `RUNNER_TEMP`. Anything
   else throws with the caller's stack.
4. **Self-verify.** Run `git --version` through the original
   (un-patched) `execSync` in an internal scope to prove git
   invocation still works after patching.

### Layer 3 — pre-commit gate (`.githooks/pre-commit` Phase 2.5)

Phase 2.5 runs `test-isolation-check.mjs --self-test` then a real
scan. The phase ID is hard-coded into `NON_SKIPPABLE_PHASES` at the
top of the hook. `should_run` checks that list FIRST and returns
true unconditionally for non-skippable phases, regardless of
`COA_SKIP_GATES` or `COA_GATE=fast`. The CI runs the same check.

### Layer 4 — sanctioned helper (`tests/_setup/safe-git.mjs`)

`safeGit(cwd, args, opts)` and `safeGitSpawn(cwd, args, opts)` are
the only paths the static check accepts as pre-cleared. They:

1. Assert the `cwd` resolves under `tmpdir()` or `RUNNER_TEMP` via
   `realpathSync` (defeating symlink-redirection tricks).
2. Strip `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`,
   `GIT_OBJECT_DIRECTORY`, `GIT_ALTERNATE_OBJECT_DIRECTORIES` from
   the spawn env (using `delete`, not empty string — empty string
   makes git fail with "The empty string is not a valid path").
3. Pin `GIT_CEILING_DIRECTORIES` to tmpdir().

Tests should call `safeGit` exclusively. The static check
whitelist-recognizes calls to it.

## Anti-evasion matrix

Every plausible bypass path was considered and explicitly closed.

| Evasion | Defense | Verification |
|---------|---------|--------------|
| Comment out the gate in `.githooks/pre-commit` | `.githooks/*` is in `claim-check` protectedPaths; staging modifications without a claim is blocked. CI runs the check too. | Verified — staging a modified pre-commit without a claim is rejected by Phase 3. |
| `COA_SKIP_GATES=2.5` to bypass | Phase 2.5 is in `NON_SKIPPABLE_PHASES`; `should_run` short-circuits true before SKIP_PHASES is consulted. | Verified — manual test with `COA_SKIP_GATES="2.5"` shows the phase still runs. |
| Add file to allowlist without justification | `test-isolation-allowlist.json` is in `protectedPaths`. Meta-test asserts `files.length === 0` initially. Growth requires a CHANGELOG entry referencing the addition reason. Per-file annotation requires a 60-char minimum reason. | Verified — meta-test fails if allowlist grows on disk without the corresponding update. |
| Indirection through helper file | Static check builds a transitive import closure from `tests/**` and follows relative imports one hop deep. | Verified — `bad-helper-import.fixture.mjs` is innocent on its own; `bad-helper.mjs` is detected when scanned (which happens because the closure includes it). The meta-test pins this path. |
| Dynamic `import()` / `require()` of `child_process` | Detected as `dynamic-import-cp` — a separate pattern that fires regardless of cwd. | Verified — `bad-dynamic-import.fixture.mjs`. |
| String concatenation obfuscation (`'gi' + 't status'`) | First literal segment of the concat is checked; if it starts with `g`, flagged as `dynamic-cmd`. | Verified — `bad-dynamic-cmd.fixture.mjs`. |
| Bare-identifier first arg (`const cmd = 'git'; spawn(cmd, ...)`) | Suspicious identifier names (`cmd`, `command`, `gitCmd`, `gitBin`, `git`, `bin`, `exe`, `gitexe`, `gitpath`) are flagged. | Verified — `bad-spawn-variable.fixture.mjs`. |
| Move test outside `tests/` | Static check walks `tests/**` AND `scripts/**` for `*.{test,spec}.mjs` repo-wide. | Verified — extending the walk to `scripts/**` was implemented from day 1. |
| Different test runner that bypasses `--import` hook | Runtime guard active at module load via package.json `--import` flag. Static check still flags pre-commit. | Verified — running `node tests/...mjs` directly without `--import` skips the runtime guard, but the static check stops the commit. |
| Set `GIT_DIR` env before `npm test` | Runtime guard refuses to start with offending env vars; loud message names each key. | Verified — `GIT_DIR=/tmp/realpath npm test` exits with code 2 and prints scrub instructions. |
| Run from cwd inside live repo | Runtime guard sets `GIT_CEILING_DIRECTORIES` to `tmpdir + project root`; even forgotten-cwd calls fail discovery. | Verified — env scrub + ceiling combination. (Earlier draft refused to start when cwd was inside any live repo; relaxed because every `pnpm test` runs from the project root, which is necessarily a live repo.) |
| Direct `fs.writeFile` to `.git` path | Static check pattern detects `**/.git/**` writes from test files. | Verified — `bad-fs-git-write.fixture.mjs`. |
| Modify static check to weaken regex | `--self-test` runs all fixtures and asserts each detected; pre-commit runs `--self-test` BEFORE the real scan. | Verified — try removing one detection branch and `--self-test` immediately fails. |
| Modify meta-test to skip a fixture | Meta-test file (`tests/checks/test-isolation-check.test.mjs`) is in `protectedPaths`. | Verified — staging modifications requires a claim. |
| Delete fixture files | Meta-test fails at startup with "missing fixture: <name>". Fixture files are NOT in `protectedPaths` (would deadlock claim coverage — claim-check uses literal-path coverage); the meta-test inventory check is the bypass-blocking defense instead. | Verified — deleting one fixture turns the meta-test red. |
| Tamper with `safe-git.mjs` to drop env override | `safe-git.mjs` is in `protectedPaths`. Meta-test asserts `SAFE_GIT_ENV_KEYS` contains all 5 keys and the array length is exactly 5. | Verified — removing `GIT_DIR` from the export turns the meta-test red. |
| Use git plumbing (`update-ref`, `write-tree`) directly | Same `execSync('git update-ref ...')` shape — caught by all the existing patterns (no-cwd / no-env-override). | Verified — covered by the same call-site analysis. |
| `process.chdir` then call git without cwd | `process-chdir` pattern fires regardless of subsequent calls. | Verified — `bad-process-chdir.fixture.mjs`. |

If a vector not listed here is discovered, add a fixture, extend the
detection, and append a row to this matrix in the same commit.

## Consequences

### Positive

- The Zvenix incident vector is closed at lint time AND at runtime.
- Test code becomes more uniform — `safeGit(dir, args)` is shorter
  and clearer than the inline `execSync('git ...', { cwd, env: ... })`
  pattern, and harder to get wrong.
- Future contributors learn the rule from the static check failure,
  not from a post-mortem.

### Negative / cost

- Existing tests that used `execSync('git ...', { cwd: dir })` had
  to be rewritten to use `safeGit` — affecting six files (`parallel-sessions.test.mjs`,
  `claim-check-collision-rehearsal.test.mjs`, `agent-compatibility-coherence.test.mjs`,
  `header-fix.test.mjs`, `header-backfill.test.mjs`, `detach-module.test.mjs`).
- A small token-aware scanner is hand-rolled in lieu of full AST
  parsing. Trade-off: zero new dependencies, but the pattern surface
  must stay narrow. The meta-test pins detection so weakening it
  fails CI.
- Pre-commit Phase 2.5 adds ~200ms per commit (fixture scan + repo
  scan). Well below the disk-wear and incident-recovery cost of the
  failure mode it prevents.

### Future work

- Backport R1 to sibling repositories Cockpit and Zvenix as separate
  slices once this template commit lands.
- Consider extending the static check to flag direct `fs.unlinkSync`
  inside `.git/` paths (not just writes) — currently no fixture
  covers that vector.
- Consider a CI-only assertion that the test-process-pid count
  matches expected fan-out, to detect runaway sub-shells before
  they can write.

## Related decisions

- ADR-0008 — inter-agent coordination protocol; protected-path
  enforcement and claim-check share the same blocking mechanism.
- ADR-0014 — per-file `@version` semantics; the lazy-stamp /
  post-commit split solved a different but adjacent disk-wear
  failure mode (TPL-233 — same field-finding date as the Zvenix
  pollution incident).
- TPL-226 — parallel post-commit policy work; expanding the
  post-commit hook beyond ADR-0014's narrow `@version` carve-out
  requires a new ADR and would interact with R1's invariants.
