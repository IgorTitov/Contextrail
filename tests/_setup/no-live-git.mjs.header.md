---
fileId: contextrail-template:tests:_setup:no-live-git:mjs
module: tests/_setup
stability: stable
steward: shared
api: --import side-effect (no exports beyond _enterInternalScope for safe-git)
dependsOn:
  - node:child_process
  - node:os
  - node:fs
  - node:module
summary: R1 runtime guard (ADR-0015) — loaded via `node --import` before tests run; refuses to start if shell carries inherited GIT_* env vars, scrubs the env, and monkey-patches child_process so any git invocation outside tmpdir throws loudly.
owns: |
  Process-startup checks for test isolation. Patches the CommonJS
  child_process module exports (execSync, exec, spawn, spawnSync,
  execFileSync, execFile) so a test that forgets the safe-git helper
  still cannot route a git write to a non-tmpdir directory.
boundaries: |
  Test process only. Loaded once per test invocation via `node --import`.
  No production code touches this file.
invariants: |
  - Refuses to start if GIT_DIR / GIT_WORK_TREE / GIT_INDEX_FILE /
    GIT_OBJECT_DIRECTORY / GIT_ALTERNATE_OBJECT_DIRECTORIES are
    inherited from the parent shell pointing to real paths.
  - Scrubs those keys from process.env before any test code runs.
  - Pins GIT_CEILING_DIRECTORIES to tmpdir + project root.
  - Monkey-patches all 6 child_process spawn entry points; first arg
    matching git/git.exe must carry cwd resolving under tmpdir.
  - Self-verifies git --version invocation still works through the patch.
risks: |
  - ESM live bindings cannot be assigned. The patch goes through the
    CommonJS handle (createRequire). If Node ever changes module-cache
    semantics, this could quietly stop reaching ESM consumers — the
    static check + meta-test catch that.
  - Patches install once at module load. A test that re-imports
    child_process via `import('node:child_process')` hits the same
    cached object and inherits the patch.
securityPrivacy: |
  Test-only. No secrets. Refuses to start with a loud message rather
  than silently stripping env, so the operator notices a poisoned shell.
notesForLLM: |
  Loaded via the package.json test scripts as `node --import
  ./tests/_setup/no-live-git.mjs ...`. To bypass for legitimate
  internal callers (safe-git.mjs, self-verify), use
  `_enterInternalScope()` and call its returned releaser. Do not export
  a global "off switch" — anti-evasion is the point.
tests:
  - tests/checks/test-isolation-check.test.mjs
linkedDocs:
  - docs/adr/0015-test-isolation-enforcement.md
related:
  - tests/_setup/safe-git.mjs
  - scripts/checks/test-isolation-check.mjs
generated: false
---

# no-live-git.mjs
