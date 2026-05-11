---
fileId: contextrail-template:tests:_setup:safe-git:mjs
module: tests/_setup
stability: stable
steward: shared
api: safeGit, safeGitSpawn, assertCwdInTmp, SAFE_GIT_ENV_KEYS
dependsOn:
  - node:child_process
  - node:os
  - node:fs
summary: The only sanctioned helper for invoking git from test code under R1 (ADR-0015) — guarantees the spawn cwd is under tmpdir and strips inherited GIT_* env vars before each call.
owns: |
  Mandatory wrapper around execSync/spawnSync('git', ...) for tests. Static
  check (scripts/checks/test-isolation-check.mjs) treats inline execSync('git
  ...') as a violation; tests must call safeGit/safeGitSpawn instead.
boundaries: |
  Test code only. Production code does not invoke git through child_process
  in the first place.
invariants: |
  - cwd is asserted via realpathSync to be under tmpdir() or RUNNER_TEMP.
  - GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, GIT_OBJECT_DIRECTORY, and
    GIT_ALTERNATE_OBJECT_DIRECTORIES are stripped from the spawn env.
  - GIT_CEILING_DIRECTORIES is pinned to tmpdir() so git cannot walk
    upward past the temp boundary.
risks: |
  - Adding a new GIT_* var to safe-git's strip list without updating the
    meta-test silently widens the escape hatch.
  - Allowing string-concatenated commands could let a test pass an
    obfuscated argument that bypasses cwd assertion.
securityPrivacy: |
  Test-only utility. No secrets handled. Outputs are git command output —
  treat as untrusted in test assertions.
notesForLLM: |
  Use safeGit(cwd, args, opts) for execSync-style invocations and
  safeGitSpawn(cwd, args, opts) for spawnSync-style. The cwd argument is
  required and must come from mkdtempSync()/mkdir under tmpdir(). Do not
  add helper wrappers that bypass the cwd assertion — the static check
  follows imports transitively.
tests:
  - tests/checks/test-isolation-check.test.mjs
linkedDocs:
  - docs/adr/0015-test-isolation-enforcement.md
related:
  - tests/_setup/no-live-git.mjs
generated: false
---

# safe-git.mjs
