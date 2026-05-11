/* @HEADER
 * @version 0.7.110 | 2026-05-06
 * @purpose Integration test proving coa-merge preserves staged files across git rebase --autostash in transport worktrees (TPL-250).
 * @sidecar coa-merge-autostash-preservation.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-250 — autostash preservation in transport-mode ceremonies.
 *
 * Regression: `git rebase --autostash main` (coa-merge Step 2.6) stashes
 * staged files then applies via `git stash apply` (no --index), which only
 * restores the working tree — the index is left empty. Previously staged
 * files became unstaged and were excluded from the resulting commit.
 *
 * Fix: `restageAfterAutostash(stagedFiles)` is called after each --autostash
 * step, restoring the index from the pre-captured file list.
 *
 * Test shape:
 *   1. Fresh git repo with main + tx-TPL-250-autostash transport branch.
 *   2. main is one commit ahead of tx-branch (so rebase has real work).
 *   3. feature.js staged on tx-branch (the file the bug previously dropped).
 *   4. coa-merge ceremony runs (--no-snapshot to avoid mergezip complexity).
 *   5. Assert: feature.js is in the HEAD commit, not left in working tree.
 *
 * Every git invocation in setup/assertions uses safeGit/safeGitSpawn (R1).
 */

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';

import { safeGitSpawn } from '../_setup/safe-git.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COA_MERGE = resolve(__dirname, '../../scripts/coa-merge.mjs');

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function createTransportFixture(label) {
  const root = mkdtempSync(join(tmpdir(), `coa-autostash-${label}-`));

  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@autostash.local']);
  safeGitSpawn(root, ['config', 'user.name', 'Autostash Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);

  // Minimal repo structure required by coa-merge ceremony.
  mkdirSync(join(root, '.claims'), { recursive: true });
  writeFileSync(join(root, 'VERSION'), '0.0.1\n');
  writeFileSync(join(root, 'CHANGELOG.md'), '# Changelog\n\n## [Unreleased]\n\n- initial\n');
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'autostash-fixture', version: '0.0.1' }, null, 2) + '\n',
  );
  // TPL-304: step 0.5 requires a .coa-session identifying the session owner.
  writeFileSync(
    join(root, '.coa-session'),
    JSON.stringify({
      sessionName: 'tx-TPL-250-autostash',
      agent: 'test-autostash-agent',
      created: new Date().toISOString(),
    }) + '\n',
  );
  safeGitSpawn(root, ['add', 'VERSION', 'CHANGELOG.md', 'package.json']);
  safeGitSpawn(root, ['commit', '-m', 'init']);

  // Transport branch created at C0 (same commit as main).
  safeGitSpawn(root, ['checkout', '-b', 'tx-TPL-250-autostash']);

  // Advance main by one commit so the rebase (git rebase --autostash main)
  // has real work to do and autostash definitely fires.
  safeGitSpawn(root, ['checkout', 'main']);
  writeFileSync(join(root, 'main-extra.txt'), 'extra commit on main\n');
  safeGitSpawn(root, ['add', 'main-extra.txt']);
  safeGitSpawn(root, ['commit', '-m', 'extra: advance main past tx-branch']);

  // Return to tx-branch.
  safeGitSpawn(root, ['checkout', 'tx-TPL-250-autostash']);

  // Populate [Unreleased] section for coa-merge to consume.
  writeFileSync(
    join(root, 'CHANGELOG.md'),
    '# Changelog\n\n## [Unreleased]\n\n- autostash preservation fix (TPL-250)\n',
  );

  // The user-staged feature file — this is what the bug previously dropped.
  writeFileSync(join(root, 'feature.js'), 'export const feature = true;\n');

  safeGitSpawn(root, ['add', 'CHANGELOG.md', 'feature.js']);

  return root;
}

function createClaim(root, claimId, targets) {
  const now = new Date();
  // Stay within claim-check's MAX_TTL_HOURS cap (168h = 7 days).
  // Use created=now and expires=+6d so filterActiveClaims keeps it valid.
  const expires = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  writeFileSync(
    join(root, '.claims', `${claimId}.json`),
    JSON.stringify(
      {
        id: claimId,
        agent: 'test-autostash-agent',
        slice: 'TPL-250-autostash',
        targets: targets.map((path) => ({ path, action: 'modify' })),
        status: 'active',
        strategy: 'modify-in-place',
        created: now.toISOString(),
        expires: expires.toISOString(),
      },
      null,
      2,
    ) + '\n',
  );
}

/**
 * Build a subprocess env that strips GIT_DIR / GIT_WORK_TREE so coa-merge's
 * git invocations stay pinned to the fixture repo, not any parent checkout.
 */
function subprocessEnv(fixtureRoot) {
  const env = { ...process.env };
  for (const key of [
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_INDEX_FILE',
    'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  ]) {
    delete env[key];
  }
  env.GIT_CEILING_DIRECTORIES = realpathSync(tmpdir());
  // Prevent any upstream git hooks installed in the test runner from firing
  // inside the fixture's commit step.
  env.GIT_CONFIG_NOSYSTEM = '1';
  // TPL-304: step 0.5 requires caller agent matching .coa-session.
  env.COA_AGENT = 'test-autostash-agent';
  return env;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('coa-merge: autostash preservation (TPL-250)', () => {
  let fixtureRoot;
  afterEach(() => {
    if (fixtureRoot && existsSync(fixtureRoot)) {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
    fixtureRoot = undefined;
  });

  test('staged feature.js is included in commit after transport rebase', () => {
    fixtureRoot = createTransportFixture('basic');

    // Claim covers CHANGELOG.md (user-staged) and feature.js.
    createClaim(fixtureRoot, 'clm-tpl250-test', ['CHANGELOG.md', 'feature.js']);

    const result = spawnSync(
      process.execPath,
      [
        COA_MERGE,
        '--message=test(fixture): autostash preservation check (TPL-250-autostash)',
        '--no-snapshot',
      ],
      {
        cwd: fixtureRoot,
        encoding: 'utf8',
        stdio: 'pipe',
        env: subprocessEnv(fixtureRoot),
      },
    );

    assert.strictEqual(
      result.status,
      0,
      `coa-merge failed (exit ${result.status}):\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    );

    // feature.js must appear in the HEAD commit's file list.
    const showResult = safeGitSpawn(fixtureRoot, ['show', '--name-only', '--format=', 'HEAD']);
    const committedFiles = showResult.stdout.trim().split('\n').filter(Boolean);
    assert.ok(
      committedFiles.includes('feature.js'),
      `feature.js missing from HEAD commit (autostash dropped it from index).\n` +
        `Committed files: ${committedFiles.join(', ')}\n` +
        `coa-merge stdout:\n${result.stdout}`,
    );

    // No staged residue.
    const staged = safeGitSpawn(fixtureRoot, ['diff', '--cached', '--name-only']);
    assert.strictEqual(
      staged.stdout.trim(),
      '',
      `Unexpected staged files after ceremony: ${staged.stdout.trim()}`,
    );

    // feature.js must not be left unstaged in the working tree.
    const unstaged = safeGitSpawn(fixtureRoot, ['diff', '--name-only']);
    assert.ok(
      !unstaged.stdout.split('\n').includes('feature.js'),
      `feature.js left as unstaged change after ceremony:\n${unstaged.stdout}`,
    );
  });

  test('restageAfterAutostash is exported and re-stages existing files', async () => {
    // Unit-level proof that the helper itself is callable and works correctly.
    const { restageAfterAutostash } = await import('../../scripts/coa-merge.mjs');

    const root = mkdtempSync(join(tmpdir(), 'coa-restage-unit-'));
    try {
      safeGitSpawn(root, ['init', '-b', 'main']);
      safeGitSpawn(root, ['config', 'user.email', 'unit@test.local']);
      safeGitSpawn(root, ['config', 'user.name', 'Unit Test']);
      safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);

      writeFileSync(join(root, 'a.txt'), 'a\n');
      writeFileSync(join(root, 'b.txt'), 'b\n');
      safeGitSpawn(root, ['add', 'a.txt', 'b.txt']);
      safeGitSpawn(root, ['commit', '-m', 'seed']);

      // Modify a.txt and stage it (simulates what autostash would have dropped).
      writeFileSync(join(root, 'a.txt'), 'a modified\n');
      safeGitSpawn(root, ['add', 'a.txt']);

      // Simulate autostash drop: reset the index but leave WD changed.
      safeGitSpawn(root, ['reset', 'HEAD', '--', 'a.txt']);

      // Verify a.txt is now unstaged.
      const beforeRestage = safeGitSpawn(root, ['diff', '--cached', '--name-only']);
      assert.ok(
        !beforeRestage.stdout.includes('a.txt'),
        'a.txt should not be staged before restage',
      );

      // Apply the fix helper.
      const r = restageAfterAutostash(['a.txt', 'nonexistent.txt'], root);
      assert.ok(r.ok, `restageAfterAutostash failed: ${JSON.stringify(r)}`);
      assert.strictEqual(r.count, 1, 'only existing files should be counted');

      // a.txt should now be back in the index.
      const afterRestage = safeGitSpawn(root, ['diff', '--cached', '--name-only']);
      assert.ok(
        afterRestage.stdout.includes('a.txt'),
        `a.txt not re-staged after restageAfterAutostash:\n${afterRestage.stdout}`,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
