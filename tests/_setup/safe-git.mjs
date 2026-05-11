/* @HEADER
 * @version 0.7.82 | 2026-05-04
 * @purpose safeGit() / safeGitSpawn() — the only sanctioned way for test code to invoke git, with mandatory tmpdir cwd and env scrubbed of GIT_DIR / GIT_WORK_TREE.
 * @sidecar safe-git.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * R1 — test isolation enforcement.
 *
 * Tests must call git through `safeGit(cwd, args, opts)` instead of inlining
 * `execSync('git ...', { cwd })`. The static check
 * (scripts/checks/test-isolation-check.mjs) treats the inline pattern as a
 * violation because cwd alone does not stop git from following GIT_DIR /
 * GIT_WORK_TREE env vars, which can silently route writes to a parent live
 * repo. This helper wraps every invocation with:
 *
 * 1. an assertion that `cwd` resolves under os.tmpdir() (or RUNNER_TEMP on CI), and
 * 2. an env override that clears all GIT_* directory pointers and pins
 *    GIT_CEILING_DIRECTORIES to tmpdir so git's upward repo search cannot
 *    escape the temp tree.
 *
 * The runtime guard (tests/_setup/no-live-git.mjs) monkey-patches
 * child_process to enforce the same cwd rule for any direct execSync /
 * spawn of git that bypasses this helper. Tests should still prefer
 * safeGit / safeGitSpawn so the static check passes without whitelist
 * annotations.
 *
 * See ADR-0015 for the full motivation and anti-evasion matrix.
 */

import { execSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { realpathSync } from 'node:fs';

/**
 * Git env keys that safeGit() strips from every spawn.
 *
 * These are the auto-discovery escape hatches a poisoned parent shell
 * could plant. buildSafeEnv() deletes them from the spawned env (empty
 * string is not equivalent to unset — git rejects empty-path keys), then
 * pins GIT_CEILING_DIRECTORIES to tmpdir so the upward repo search
 * cannot escape the temp tree even if a test forgets cwd.
 *
 * Meta-test asserts this list contains all 6 keys before the helper is
 * allowed to ship. Tampering with the list (dropping a key) fails the
 * meta-test.
 *
 * GIT_COMMON_DIR added in TPL-274: git sets this in hook environments inside
 * linked worktrees to point at the common .git dir. Without unsetting it,
 * git commit writes objects/refs to the live repo even when cwd is in tmpdir.
 */
export const SAFE_GIT_ENV_KEYS = Object.freeze([
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_COMMON_DIR',
]);

function buildSafeEnv(extra = {}) {
  // Start from the current env so PATH and other non-git vars survive,
  // then strip the dangerous GIT_* keys entirely. Setting them to ''
  // would NOT unset them — git treats empty-string GIT_DIR as
  // "use this empty path" and fails with "The empty string is not a
  // valid path". `delete` removes the key from the spawn env, which
  // matches the unset semantics git expects.
  const env = { ...process.env, ...extra };
  for (const key of SAFE_GIT_ENV_KEYS) {
    delete env[key];
  }
  // GIT_CEILING_DIRECTORIES is the one we *do* want set — to tmpdir.
  // (extra.* could have set this; the line above just removed it. We
  // intentionally restamp it last so callers cannot weaken the ceiling.)
  env.GIT_CEILING_DIRECTORIES = realpathSync(tmpdir());
  return env;
}

function tmpdirRoots() {
  const roots = [realpathSync(tmpdir())];
  if (process.env.RUNNER_TEMP) {
    try {
      roots.push(realpathSync(process.env.RUNNER_TEMP));
    } catch {
      // RUNNER_TEMP path missing on disk — ignore.
    }
  }
  return roots;
}

/**
 * Throw if cwd is not under any allowed tmpdir root.
 *
 * Uses realpathSync to defeat symlink games (e.g., a test pointing cwd
 * to a tmpdir-symlink that resolves into the live repo).
 */
export function assertCwdInTmp(cwd) {
  if (typeof cwd !== 'string' || cwd.length === 0) {
    throw new Error('safe-git: cwd is required and must be a non-empty string');
  }
  let real;
  try {
    real = realpathSync(cwd);
  } catch (err) {
    throw new Error(`safe-git: cwd does not exist on disk: ${cwd} (${err.message})`);
  }
  const roots = tmpdirRoots();
  for (const root of roots) {
    if (real === root || real.startsWith(root + '\\') || real.startsWith(root + '/')) {
      return;
    }
  }
  throw new Error(
    `safe-git: cwd ${real} is not under any allowed tmpdir root [${roots.join(', ')}]`,
  );
}

/**
 * Synchronous git invocation with mandatory tmpdir cwd and scrubbed env.
 *
 * @param {string} cwd  - directory under os.tmpdir() to run git in
 * @param {string|string[]} args - either a full arg string ("status --porcelain")
 *                                  or an array of args (["status", "--porcelain"]).
 * @param {object} opts - additional execSync options (encoding, stdio, input, etc.)
 * @returns {Buffer|string} same as execSync
 */
export function safeGit(cwd, args, opts = {}) {
  assertCwdInTmp(cwd);
  const argString = Array.isArray(args) ? args.join(' ') : String(args);
  return execSync(`git ${argString}`, {
    cwd,
    env: buildSafeEnv(opts.env ?? {}),
    stdio: opts.stdio ?? 'pipe',
    encoding: opts.encoding,
    input: opts.input,
    timeout: opts.timeout,
    maxBuffer: opts.maxBuffer,
    shell: opts.shell,
  });
}

/**
 * spawnSync variant. Use when you need structured stdout/stderr/status
 * rather than execSync's combined throw-on-nonzero behavior.
 *
 * Always runs git with `shell: false` so argv is passed exactly as given —
 * no shell-string interpolation surprises.
 */
export function safeGitSpawn(cwd, args, opts = {}) {
  assertCwdInTmp(cwd);
  const argv = Array.isArray(args)
    ? args
    : String(args)
        .split(/\s+/)
        .filter((s) => s.length > 0);
  return spawnSync('git', argv, {
    cwd,
    env: buildSafeEnv(opts.env ?? {}),
    stdio: opts.stdio ?? 'pipe',
    encoding: opts.encoding ?? 'utf8',
    input: opts.input,
    timeout: opts.timeout,
    maxBuffer: opts.maxBuffer,
    shell: false,
  });
}
