/* @HEADER
 * @version 0.7.81 | 2026-05-04
 * @purpose Bad fixture (TPL-272): raw execSync('git ...') with correct cwd and env is still forbidden — all git calls in tests must go through safeGit/safeGitSpawn.
 * @sidecar bad-raw-exec-with-safe-env.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Bad fixture (TPL-272): raw execSync with proper cwd (mkdtemp-derived) and
// env (GIT_DIR/GIT_WORK_TREE nulled) was acceptable before TPL-272.
// Now any raw execSync/spawnSync/spawn with 'git' as first arg must be
// migrated to safeGit(cwd, args) or safeGitSpawn(cwd, args).
// Expected verdict: violation [raw-git-call].

import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'fx-'));
execSync('git init', {
  cwd: dir,
  env: { ...process.env, GIT_DIR: '', GIT_WORK_TREE: '' },
  stdio: 'pipe',
});
