/* @HEADER
 * @version 0.7.63 | 2026-05-03
 * @purpose Regression proof for TPL-261: header-fix --use-current-version auto-stages changed files even when COA_PRE_COMMIT is not set.
 * @sidecar header-fix-auto-stage.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-261 — cascade-leak fix regression test.
 *
 * Prior to TPL-261, the auto-stage block in header-fix was guarded by
 * `useCurrentVersion && fromPreCommit`. That gate meant that when header-fix
 * was invoked outside the pre-commit hook (COA_PRE_COMMIT !== '1'), stamped
 * files were left unstaged in the working tree — accumulating residue
 * identical to the pre-TPL-246 cascade problem.
 *
 * TPL-261 removes the `fromPreCommit` gate so auto-stage fires unconditionally
 * whenever `--use-current-version` is active and files were stamped.
 *
 * This test proves the fix: run header-fix with --use-current-version and
 * without COA_PRE_COMMIT=1; assert that stamped files land in git's staging
 * index.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { safeGitSpawn } from '../_setup/safe-git.mjs';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');
const HEADER_FIX = join(REPO_ROOT, 'scripts', 'checks', 'header-fix.mjs');

/** Thin git wrapper — throws on nonzero exit. */
function git(cwd, args) {
  const out = safeGitSpawn(cwd, args, { encoding: 'utf8', stdio: 'pipe' });
  if (out.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed:\n${out.stderr}`);
  }
  return out.stdout;
}

/** Create a minimal git repo in tmpdir with a slim-header JS file. */
function createTempRepo(label) {
  const dir = mkdtempSync(join(tmpdir(), `tpl-261-${label}-`));

  git(dir, ['init', '--quiet']);
  git(dir, ['config', 'user.email', 'test@test.com']);
  git(dir, ['config', 'user.name', 'Test']);

  // VERSION that differs from the stale @version in the fixture file so
  // header-fix will actually re-stamp (and therefore stage) the file.
  writeFileSync(join(dir, 'VERSION'), '0.7.62\n');

  // A slim-header JS file with a stale @version that eager stamping will update.
  writeFileSync(
    join(dir, 'sample.mjs'),
    [
      '/* @HEADER',
      ' * @version 0.1.0 | 2026-01-01',
      ' * @purpose TPL-261 cascade-leak regression fixture.',
      ' * @sidecar sample.mjs.header.md',
      ' * @layer util | @hex _none_ | @ctx _none_',
      ' * @public false',
      ' * @edit rewrite-ok',
      ' */',
      '',
      'export const x = 1;',
      '',
    ].join('\n'),
  );

  git(dir, ['add', 'VERSION', 'sample.mjs']);
  git(dir, ['commit', '-m', 'init', '--quiet']);

  return dir;
}

// ---------------------------------------------------------------------------
// TPL-261 — auto-stage fires even without COA_PRE_COMMIT=1
// ---------------------------------------------------------------------------

describe('header-fix --use-current-version auto-stage — TPL-261', () => {
  test('stamps and stages the file when COA_PRE_COMMIT is absent', () => {
    const dir = createTempRepo('no-precommit');
    try {
      // Ensure COA_PRE_COMMIT is absent from the environment so the old gate
      // (had it still existed) would have suppressed auto-stage.
      const env = { ...process.env };
      delete env.COA_PRE_COMMIT;

      const out = spawnSync(
        process.execPath,
        [HEADER_FIX, '--all', '--use-current-version', '--json'],
        { cwd: dir, env, encoding: 'utf8', stdio: 'pipe' },
      );

      assert.equal(
        out.status,
        0,
        `header-fix exited with ${out.status}:\n${out.stderr}\n${out.stdout}`,
      );

      const json = JSON.parse(out.stdout);
      assert.equal(json.ok, true, 'header-fix must report ok:true');

      // The file must have been stamped (it has a stale @version vs VERSION).
      assert.ok(
        json.data.changed.some((f) => f.includes('sample.mjs')),
        `expected sample.mjs in changed list, got: ${JSON.stringify(json.data.changed)}`,
      );

      // The critical TPL-261 assertion: the stamped file is in git's staging
      // index — it was auto-staged even though COA_PRE_COMMIT was unset.
      const staged = git(dir, ['diff', '--cached', '--name-only']);
      assert.ok(
        staged
          .trim()
          .split('\n')
          .some((f) => f === 'sample.mjs'),
        `expected sample.mjs to be staged in git index, got staged files: "${staged.trim()}"`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('stamps and stages the file when COA_PRE_COMMIT is explicitly set to 1 (regression guard)', () => {
    // Ensure the pre-commit path still works after the gate removal.
    const dir = createTempRepo('with-precommit');
    try {
      const env = { ...process.env, COA_PRE_COMMIT: '1' };

      const out = spawnSync(
        process.execPath,
        [HEADER_FIX, '--all', '--use-current-version', '--json'],
        { cwd: dir, env, encoding: 'utf8', stdio: 'pipe' },
      );

      assert.equal(
        out.status,
        0,
        `header-fix exited with ${out.status}:\n${out.stderr}\n${out.stdout}`,
      );

      const json = JSON.parse(out.stdout);
      assert.equal(json.ok, true);

      // File was stamped.
      assert.ok(
        json.data.changed.some((f) => f.includes('sample.mjs')),
        `expected sample.mjs in changed list, got: ${JSON.stringify(json.data.changed)}`,
      );

      // File was staged.
      const staged = git(dir, ['diff', '--cached', '--name-only']);
      assert.ok(
        staged
          .trim()
          .split('\n')
          .some((f) => f === 'sample.mjs'),
        `expected sample.mjs to be staged, got: "${staged.trim()}"`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('no auto-stage when --use-current-version is absent (unchanged behaviour)', () => {
    // Without --use-current-version, nothing should be auto-staged even if
    // header-fix re-stamps files (it does not promise staging without the flag).
    const dir = createTempRepo('no-flag');
    try {
      const env = { ...process.env };
      delete env.COA_PRE_COMMIT;

      // Run without --use-current-version — this is the normal manual invocation.
      const out = spawnSync(process.execPath, [HEADER_FIX, '--all', '--json'], {
        cwd: dir,
        env,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      assert.equal(out.status, 0, `header-fix failed: ${out.stderr}`);

      // Nothing should be in the staging index.
      const staged = git(dir, ['diff', '--cached', '--name-only']);
      assert.equal(
        staged.trim(),
        '',
        `expected empty staging index without --use-current-version, got: "${staged.trim()}"`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
